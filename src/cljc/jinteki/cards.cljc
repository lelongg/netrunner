(ns jinteki.cards
  #?(:engine (:require)
     :cljs
     (:require [reagent.core :as r])))


(defonce all-cards #?(:engine (atom {})
                      :clj (atom {})
                      :cljs (r/atom {})))

(defonce mwl #?(:engine (atom {})
                :clj (atom {})
                :cljs (r/atom {})))

(defonce sets (atom []))

(defonce cycles (atom []))
