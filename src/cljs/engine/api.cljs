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
   [game.core.diffs :as diffs]
   [game.core.process-actions :refer [command-parser process-action]]
   [game.core.say :refer [system-say]]
   [game.core.set-up :refer [init-game]]
   [game.core.winning :refer [concede]]
   [game.quotes :as quotes]
   [jinteki.cards :refer [all-cards]]
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

(defn create-game
  "Creates a game from a JS description:
  {gameid, format, corp: {user, deck: {identity, cards: [{qty, card}]}}, runner: {...}}
  Returns an opaque handle."
  [setup]
  (let [{:keys [gameid format corp runner messages] :as setup} (->clj setup)
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
  "Runs f on the game state and refreshes the cached views. Like the Jinteki
  server, an action that throws is rolled back before the error propagates."
  [game f]
  (let [state (.-state game)
        old-state @state
        ret (try
              (f state)
              (catch :default e
                (reset! state old-state)
                (throw e)))
        d (diffs/public-diffs old-state state true false false)]
    (swap! state assoc :public-states (:public-states d))
    (->js {:ok (boolean ret)
           :diffs {:corp (:corp-diff d)
                   :runner (:runner-diff d)
                   :spectator (:spect-diff d)}})))

(defn act
  "Applies a command for a side. Returns {ok, diffs: {corp, runner, spectator}}."
  [game side command args]
  (let [side (side-kw side)
        args (normalize-args command (->clj args))]
    (apply-and-diff game #(process-action command % side args))))

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
