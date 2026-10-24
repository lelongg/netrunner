(ns engine.api
  (:require
   [game.cards.agendas]
   [game.cards.assets]
   [game.cards.basic]
   [game.cards.events]
   [game.cards.hardware]
   [game.cards.ice]
   [game.cards.identities]
   [game.cards.operations]
   [game.cards.programs]
   [game.cards.resources]
   [game.cards.upgrades]
   [game.core.bad-publicity :refer [bad-publicity-available]]
   [game.core.board :refer [all-installed]]
   [game.core.costs :refer [total-available-credits]]
   [game.core.diffs :as diffs]
   [game.core.effects :refer [any-effects]]
   [game.core.process-actions :refer [checkpoint+clean-up command-parser process-action]]
   [game.core.say :refer [system-say]]
   [game.core.set-up :refer [init-game]]
   [game.core.winning :refer [concede]]
   [game.quotes :as quotes]
   [jinteki.cards :refer [all-cards]]
   [jinteki.chimera :as chimera]
   [jinteki.i18n :as i18n]
   [jinteki.preconstructed :as precon]))

(defn- ->clj [x]
  (js->clj x :keywordize-keys true))

(defn- kw->str [k]
  (if-let [n (namespace k)] (str n "/" (name k)) (name k)))

(defn- ->js [x]
  (cond
    (keyword? x) (kw->str x)
    (map? x) (let [o #js {}]
               (doseq [[k v] x]
                 (aset o (if (keyword? k) (kw->str k) (str k)) (->js v)))
               o)
    (coll? x) (let [a #js []]
                (doseq [v x] (.push a (->js v)))
                a)
    (or (string? x) (number? x) (boolean? x) (nil? x)) x
    :else (str x)))

(def ^:private keyword-arg-commands #{"change" "set-property"})

(defn- normalize-args [command args]
  (cond-> args
    (and (keyword-arg-commands command) (string? (:key args)))
    (update :key keyword)))

(defn- side-kw [side]
  (keyword side))

(defn load-cards
  "Takes an array of card objects (NetrunnerDB/Jinteki format) and registers them by title."
  [cards]
  (let [cards (->clj cards)]
    (reset! all-cards (into {} (map (juxt :title identity)) cards))
    (count cards)))

(defn load-quotes [quotes]
  (reset! quotes/identity-quotes (js->clj quotes)))

(defn- by-title [deck]
  {:name (:name deck)
   :identity (get @all-cards (get-in deck [:identity :title]))
   :cards (vec (for [{:keys [qty card]} (:cards deck)
                     :let [c (get @all-cards card)]
                     :when c]
                 {:qty qty :card c}))})

(defn- format-decks
  "Chimera deals both players a random deck, built inside the seeded game setup so
  every replica deals the same one. A quick draft starts from an empty deck that
  the draft fills."
  [format corp runner]
  (case format
    "chimera" [(assoc corp :deck (by-title (chimera/make-corp-deck)))
               (assoc runner :deck (by-title (chimera/make-runner-deck)))]
    "quick-draft" [(assoc-in corp [:deck :cards] [])
                   (assoc-in runner [:deck :cards] [])]
    [corp runner]))

(defn create-game
  "Creates a game from a JS description:
  {gameid, format, corp: {user, deck: {identity, cards: [{qty, card}]}}, runner: {...}}
  Returns an opaque handle."
  [setup]
  (let [{:keys [gameid format corp runner messages] :as setup} (->clj setup)
        [corp runner] (format-decks format corp runner)
        player (fn [side p] (assoc p :side side))
        state (init-game {:gameid (or gameid (str (random-uuid)))
                          :format (some-> format keyword)
                          :room "casual"
                          :players [(player "Corp" corp) (player "Runner" runner)]
                          :messages messages
                          :open-decklists (:open-decklists setup)})
        states (diffs/public-states state)]
    (swap! state assoc :public-states states)
    #js {:state state}))

(defn- views [states]
  {:corp (:corp-state states)
   :runner (:runner-state states)
   :spectator (:spect-state states)})

(defn view
  "Full privatized state for a side: \"corp\", \"runner\" or \"spectator\"."
  [game side]
  (let [state (.-state game)
        states (or (:public-states @state) (diffs/public-states state))]
    (->js (get (views states) (side-kw side)))))

(defn- apply-and-diff
  "Runs f on the game state and refreshes the cached views exactly as the
  Jinteki server does after every action: building them touches the game state,
  so every client must build them at the same points to stay in sync. The
  per-side diffs the server sends are skipped. Like the server, an action that
  throws is rolled back before the error propagates."
  [game f]
  (let [state (.-state game)
        old-state @state
        ret (try
              (f state)
              (catch :default e
                (reset! state old-state)
                (throw e)))
        _ (swap! state update :sequence inc)
        states (diffs/public-states state true false false)]
    (swap! state assoc :public-states states)
    (->js {:ok (boolean ret)})))

(defn act
  "Applies a command for a side. Returns {ok}."
  [game side command args]
  (let [side (side-kw side)
        args (normalize-args command (->clj args))]
    (apply-and-diff game #(process-action command % side args))))

(defn- game-part
  "The game without its history (the log, the events of the turn and of the
  run, the states kept for undo), the cached views, the action counters and
  the toasts."
  [state]
  (-> state
      (dissoc :log :history :click-states :turn-state :paid-ability-state :public-states :sequence :eid :turn-events)
      (update :run #(some-> % (dissoc :events)))
      (update :corp dissoc :toast)
      (update :runner dissoc :toast)))

(defn checkpoint
  "A snapshot of the game to try actions on it and roll them back with
  restore. Card abilities keep waiting on the game itself, so a try runs on
  the game and not on a copy. The snapshot also holds the game as an action
  that does nothing leaves it, since every action ends with the engine's
  checkpoint."
  [game]
  (let [state (.-state game)
        snapshot @state
        settled (try
                  (checkpoint+clean-up state)
                  (game-part @state)
                  (finally (reset! state snapshot)))]
    #js {:state snapshot :settled settled}))

(defn attempt
  "Applies a command like act without refreshing the views, for a try that
  restore rolls back."
  [game side command args]
  (process-action command (.-state game) (side-kw side) (normalize-args command (->clj args)))
  nil)

(defn restore [game ^js snapshot]
  (reset! (.-state game) (.-state snapshot))
  nil)

(defn unchanged?
  "Whether the game is as an action that does nothing would leave it: an
  action the engine refused."
  [game ^js snapshot]
  (= (game-part @(.-state game)) (.-settled snapshot)))

(defn available-credits
  "The credits a side could spend on an ability of the installed card cid:
  the total, and the part of it from the credit pool and from bad publicity."
  [game side cid]
  (let [state (.-state game)
        side (side-kw side)
        card (some #(when (= cid (:cid %)) %) (all-installed state side))
        eid {:eid -1 :source card :source-type :ability}
        total (total-available-credits state side eid card)
        pool (if (or (any-effects state side :cannot-pay-credit)
                     (any-effects state side :cannot-pay-credits-from-pool))
               0
               (get-in @state [side :credit] 0))
        bad-pub (if (any-effects state side :cannot-pay-credit) 0 (bad-publicity-available state side))]
    #js {:total total :pool pool :badPub bad-pub :cards (- total pool bad-pub)}))

(defn say
  [game side user text]
  (let [side (side-kw side)]
    (apply-and-diff game #(command-parser % side {:user (->clj user) :text text}))))

(defn notify
  [game text]
  (apply-and-diff game #(system-say % nil text)))

(defn concede!
  [game side]
  (apply-and-diff game #(concede % (side-kw side))))

(defn winner [game]
  (some-> @(.-state game) :winner name))

(defn load-dictionary
  "Registers a Fluent (.ftl) dictionary, e.g. resources/public/i18n/fr/*.ftl concatenated."
  [lang ftl]
  (i18n/insert-lang! lang ftl))

(defn set-language [lang]
  (reset! i18n/language-cursor lang))

(defn render-message
  "Turns a log entry text or a prompt msg into a display string."
  [msg]
  (cond
    (string? msg) msg
    (nil? msg) ""
    :else
    (let [m (->clj msg)]
      (or (:raw-text m)
          (try (i18n/build-msg m)
               (catch :default _ (str (:msg/type m))))))))

(defn- precon-deck [{:keys [name identity cards format]}]
  {:name name
   :format format
   :identity (:title identity)
   :cards (mapv (fn [{:keys [qty card]}] {:qty qty :title card}) cards)})

(defn precons
  "Preconstructed matchups: [{key, title, corp, runner}] with decks as card titles."
  []
  (->js
   (for [k (concat [:beginner :intermediate] (sort precon/all-matchups))
         :let [{:keys [tr-inner corp runner]} (precon/matchup-by-key k)]]
     {:key k
      :title (second tr-inner)
      :corp (precon-deck corp)
      :runner (precon-deck runner)})))
