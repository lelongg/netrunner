### templates???

# Notes for French:
# - French plural rules put 0 in the "one" category, so selectors that print a
#   literal "1" or a list of titles in their [one] variant also get a [0] variant.
# - Possessives are written out (sa / son / ses) instead of [their]: in French
#   the possessive agrees with the possessed noun, not with the player.

## Terms aka consistent names

# Cases used in this file:
#   nominative / accusative: la Corpo, lae Runner, le QG…
#   genitive: bare form used as an adjective (cartes Corpo, cartes Runner)
#   possessive: "de" form (de la Corpo, du QG, des Archives)
#   dative: "à" form (à la Corpo, au QG, aux Archives)

-corp = {$case ->
    [genitive] Corpo
    [accusative] la Corpo
    [possessive] de la Corpo
    [dative] à la Corpo
    *[nominative] la Corpo
}

-runner = {$case ->
    [genitive] Runner
    [accusative] lae Runner
    [possessive] de lae Runner
    [dative] à lae Runner
    *[nominative] lae Runner
}

-archives = {$case ->
    [genitive] Archives
    [possessive] des Archives
    [dative] aux Archives
    *[nominative] les Archives
}
-hq = {$case ->
    [genitive] QG
    [possessive] du QG
    [dative] au QG
    *[nominative] le QG
}
-rd = {$case ->
    [possessive] de R&D
    [dative] à R&D
    *[nominative] R&D
}

-grip = {$case ->
    [possessive] de la main
    [dative] à la main
    *[nominative] la main
}
-heap = {$case ->
    [possessive] du tas
    [dative] au tas
    *[nominative] le tas
}
-stack = {$case ->
    [possessive] de la pile
    [dative] à la pile
    *[nominative] la pile
}

-credit = [Credit]
-click = [Click]
-bad-publicity = {$number ->
    [plural] mauvaises publicités
    *[singular] mauvaise publicité
}
-tag = tag

-credit-pool = réserve de crédits

## card types

-agenda = projet
-agenda-plural = projets
-asset = avoir
-asset-plural = avoirs
-event = évènement
-event-plural = évènements
-hardware = matériel
-hardware-plural = matériels
-ice = glace
-ice-plural = glaces
-ice-type = {$number ->
    [plural] glaces
    *[singular] glace
}
-identity = identité
-identity-plural = identités
-operation = opération
-operation-plural = opérations
-program = programme
-program-plural = programmes
-resource = ressource
-resource-plural = ressources
-upgrade = extension
-upgrade-plural = extensions

## locations

server-name = {$server ->
    [archives] {-archives}
    [hq] {-hq}
    [rd] {-rd}
    *[other] le serveur {$server}
}

## Logical templates

use-card = {$username} utilise {$title} pour {$do-ability}.
pay-use-card = {$username} {$payment}, puis utilise {$title} pour {$do-ability}.
satisfy-card = {$username} {$payment} pour satisfaire {$title}.

# join ability framents together naturally
# for example, "$player uses $card to do x and do y and do z" will use [join-with-and]
# like this: "$player uses $card to do x[join-with-and]do y[join-with-and]do z."

join-with-and = {" "}et{" "}
join-list = ,{" "}

## Ability fragments

# generic

do-nothing = ne rien faire
play-card = jouer {$title}
play-card-no-additional-costs = jouer {$title} en ignorant les coûts supplémentaires
select = sélectionner {$card-str}

# trashing cards

trash-self = l'effacer
trash-card = effacer {$card-str}
trash-card-at-no-cost = effacer {$card-str} sans payer de coût
trash-n-cards = effacer {$count ->
    [0] 0 carte
    [one] {$count} carte
    *[other] {$count} cartes
}
trash-cards = effacer {$count ->
    [0] 0 carte
    [one] 1 carte ({$card-strs})
    *[other] {$count} cartes ({$card-strs})
}
trash-accessed-card = effacer la carte accédée ({$title})
trash-all-cards-in-grip = effacer toutes les cartes {-grip(case: "possessive")}
trash-all-agendas-by-type = effacer tous les {-agenda-plural}
trash-all-assets-by-type = effacer tous les {-asset-plural}
trash-all-events-by-type = effacer tous les {-event-plural}
trash-all-hardware-by-type = effacer tous les {-hardware-plural}
trash-all-ice-by-type = effacer toutes les {-ice-type(number: "plural")}
trash-all-operations-by-type = effacer toutes les {-operation-plural}
trash-all-resource-by-type = effacer toutes les {-resource-plural}
trash-all-upgrade-by-type = effacer toutes les {-upgrade-plural}

trash-all-cards-in-server-at-no-cost = effacer sans payer de coût toutes les cartes présentes dans {$server}

# credits

gain-credits = gagner {$count} {-credit}
corp-gains-credits = faire gagner {$count} {-credit} {-corp(case: "dative")}
runner-gains-credits = faire gagner {$count} {-credit} {-runner(case: "dative")}

# drawing cards

draw-cards = piocher {$count ->
    [one] {$count} carte
    *[other] {$count} cartes
}

# clicks

gain-clicks = gagner {$count ->
    [0] 0 [Click]
    [one] [Click]
    *[other] {$count} [Click]
}

lose-clicks = perdre {$count ->
    [0] 0 [Click]
    [one] [Click]
    *[other] {$count} [Click]
}

# tags

avoid-tags = éviter {$count ->
    [one] {$count} tag
    *[other] {$count} tags
}
take-tags = prendre {$count ->
    [one] {$count} tag
    *[other] {$count} tags
}
remove-tags = retirer {$count ->
    [one] {$count} tag
    *[other] {$count} tags
}
remove-all-tags = retirer tous les tags ({$count})

# runner shuffling

shuffle-grip-into-stack = mélanger { -grip } dans { -stack }
shuffle-grip-and-heap-into-stack = mélanger { -grip } et { -heap } dans { -stack }
shuffle-self-into-stack = la mélanger dans {-stack}
shuffle-cards-into-stack = mélanger {$count ->
    [0] 0 carte dans {-stack}
    [one] {$titles} dans {-stack}
    *[other] {$count} cartes ({$titles}) dans {-stack}
}
shuffle-stack = mélanger {-stack}

# corp shuffling

shuffle-cards-in-server-into-rd = mélanger dans {-rd} toutes les cartes présentes dans {$server}
shuffle-cards-into-rd = mélanger {$count ->
    [0] 0 carte dans {-rd}
    [one] {$titles} dans {-rd}
    *[other] {$count} cartes ({$titles}) dans {-rd}
}

# score area stuff

forfeit = renoncer à {$title}
add-self-to-score-area = l'ajouter à sa zone de score en tant que projet valant {$value ->
    [one] {$value} point de projet
    *[other] {$value} points de projet
}

give-bad-publicity = donner {$count ->
    [one] {$count} { -bad-publicity }
    *[other] {$count} { -bad-publicity(number: "plural") }
} {-corp(case: "dative")}

# moving cards

add-self-to-grip = l'ajouter à sa main
add-card-to-grip = ajouter {$title} à sa main
add-card-to-hq = ajouter {$card-str} {-hq(case: "dative")}

add-card-from-stack-to-grip = ajouter {$card-str} {-stack(case: "possessive")} à sa main
add-card-to-top-of-stack = placer {$card-str} sur le dessus {-stack(case: "possessive")}
add-card-to-bottom-of-stack = placer {$card-str} en dessous {-stack(case: "possessive")}

add-card-to-top-of-rd = placer {$title} sur le dessus {-rd(case: "possessive")}
add-card-to-bottom-of-rd = placer {$title} en dessous {-rd(case: "possessive")}

add-cards-from-heap-to-grip = ajouter {$titles} {-heap(case: "possessive")} à sa main

move-seen-unseen-into-grip = déplacer {$seen} et {$unseen-cnt ->
    [one] {$unseen-cnt} carte non vue dans {-grip}
    *[other] {$unseen-cnt} cartes non vues dans {-grip}
}
move-seen-into-grip = déplacer {$seen} dans {-grip}
move-unseen-into-grip = déplacer {$unseen-cnt ->
    [one] {$unseen-cnt} carte non vue dans {-grip}
    *[other] {$unseen-cnt} cartes non vues dans {-grip}
}

move-seen-unseen-into-hq = déplacer {$seen} et {$unseen-cnt ->
    [one] {$unseen-cnt} carte non vue dans {-hq}
    *[other] {$unseen-cnt} cartes non vues dans {-hq}
}
move-seen-into-hq = déplacer {$seen} dans {-hq}
move-unseen-into-hq = déplacer {$unseen-cnt ->
    [one] {$unseen-cnt} carte non vue dans {-hq}
    *[other] {$unseen-cnt} cartes non vues dans {-hq}
}

# remove from the game (rfg)

rfg-card = retirer {$title} du jeu

# reveal

expose-card = exposer {$title}
reveal-n-cards-in-hq = révéler {$count ->
    [one] {$count} carte {-hq(case: "possessive")}
    *[other] {$count} cartes {-hq(case: "possessive")}
}
reveal-cards-in-hq = révéler {$count ->
    [0] 0 carte {-hq(case: "possessive")}
    [one] {$titles} {-hq(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-hq(case: "possessive")}
}
reveal-cards-in-grip = révéler {$count ->
    [0] 0 carte {-grip(case: "possessive")}
    [one] {$titles} {-grip(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-grip(case: "possessive")}
}
reveal-top-of-stack = révéler {$title}, sur le dessus {-stack(case: "possessive")}

disable-corp-id = rendre inactive l'identité {-corp(case:"possessive")}
disable-runner-id = rendre inactive l'identité {-runner(case:"possessive")}

# turns

take-additional-turn = jouer un tour supplémentaire après celui-ci
reduce-corp-max-hand-size-bad-publicity = réduire de 1 la taille de main maximale {-corp(case:"possessive")} pour chaque { -bad-publicity }
reduce-corp-click-next-turn = donner {-corp(case:"dative")} {$count} {-click} de moins à dépenser lors de son prochain tour

# rearrange stuff

rearrange-installed-ice = réorganiser autant de glaces que voulu parmi celles qui protègent les serveurs
rearrange-top-n-cards-rd = réorganiser {$count ->
    [one] la carte du dessus {-rd(case: "possessive")}
    *[other] les {$count} cartes du dessus {-rd(case: "possessive")}
}
trash-or-rearrange-top-of-stack = regarder puis effacer ou réorganiser {$count ->
    [one] la carte du dessus {-stack(case: "possessive")}
    *[other] les {$count} cartes du dessus {-stack(case: "possessive")}
}

swap-two-ice-positions = échanger les positions de {$card-str} et de {$card-str2}

# advancement counters

place-n-advancement-counters = placer {$count ->
    [0] 0 pion avancement sur {$card-str}
    [one] {$count} pion avancement sur {$card-str}
    *[other] {$count} pions avancement sur {$card-str}
}

remove-advancement-counters = retirer {$count ->
    [0] 0 pion avancement de {$card-str}
    [one] {$count} pion avancement de {$card-str}
    *[other] {$count} pions avancement de {$card-str}
}

place-virus-counters = placer {$count ->
    [one] {$count} pion virus sur {$title}
    *[other] {$count} pions virus sur {$title}
}

charge-card = charger {$card-str} {$count ->
    [one] {$count} fois
    *[other] {$count} fois
}

place-credits-on-self = y placer {$credits} {-credit}
place-credits-on-self-for-trash-costs = y placer {$credits} {-credit} pour payer des coûts d'effacement

look-at-top-cards-add-to-grip = regarder {$top-count ->
    [one] la carte du dessus de la pile et en ajouter {$add-count} à sa main
    *[other] les {$top-count} cartes du dessus de la pile et en ajouter {$add-count} à sa main
}

guess = deviner {$choice}

reveal-copies-of-self = révéler {$count ->
    [one] {$count} exemplaire de cette carte
    *[other] {$count} exemplaires de cette carte
}

# forcing

force-take-bad-publicity = forcer {-corp(case: "nominative")} à prendre {$count ->
    [one] {$count} { -bad-publicity }
    *[other] {$count} { -bad-publicity(number: "plural") }
}
force-trash-installed-ice = forcer {-corp(case: "nominative")} à effacer une {-ice} protégeant {$server}
force-corp-trash-top-of-rd = forcer {-corp(case: "nominative")} à effacer {$count ->
    [one] la carte du dessus {-rd(case: "possessive")}
    *[other] les {$count} cartes du dessus {-rd(case: "possessive")}
}
force-corp-trash-additional-top-of-rd = forcer {-corp(case: "nominative")} à effacer {$count ->
    [one] une carte supplémentaire du dessus {-rd(case: "possessive")}
    *[other] {$count} cartes supplémentaires du dessus {-rd(case: "possessive")}
}
force-corp-rez = forcer {-corp(case: "nominative")} à activer {$title}
force-corp-trash = forcer {-corp(case: "nominative")} à effacer {$title}
force-add-all-hq-cards-to-top-of-rd = forcer {-corp(case: "nominative")} à placer toutes les cartes {-hq(case: "possessive")} sur le dessus {-rd(case: "possessive")}
force-corp-pay-credits = forcer {-corp(case: "nominative")} à payer {$credits} {-credit}
force-corp-lose-credits = forcer {-corp(case: "nominative")} à perdre {$credits} {-credit}
force-corp-draw-cards = forcer {-corp(case: "nominative")} à piocher {$count ->
    [one] {$count} carte
    *[other] {$count} cartes
}
force-corp-discard-from-hq = forcer {-corp(case: "nominative")} à défausser {$count ->
    [one] {$count} carte {-hq(case: "possessive")}
    *[other] {$count} cartes {-hq(case: "possessive")}
}
force-corp-random-discard-from-hq = forcer {-corp(case: "nominative")} à défausser {$count ->
    [one] {$count} carte {-hq(case: "possessive")} au hasard
    *[other] {$count} cartes {-hq(case: "possessive")} au hasard
}

force-runner-draw-cards = forcer {-runner(case: "nominative")} à piocher {$count ->
    [one] {$count} carte
    *[other] {$count} cartes
}

force-runner-gain-credits = forcer {-runner(case: "nominative")} à gagner {$credits} {-credit}

each-player-draws-cards = faire piocher {$count ->
    [one] {$count} carte
    *[other] {$count} cartes
} à chaque joueur·euse

# all installs

# runner installs

runner-install-card = installer {$title}

install-with-discount = installer {$title} en réduisant son coût de {$discount} {-credit}
install-from-grip = installer {$title} depuis {-grip}
install-from-grip-with-discount = installer {$title} depuis {-grip} en réduisant son coût de {$discount}

install-from-stack = installer {$title} depuis {-stack}
install-from-stack-with-discount = installer {$title} depuis {-stack} en réduisant son coût de {$discount}
install-program-from-heap = installer un {-program} depuis {-heap}
install-program-from-stack = installer un {-program} depuis {-stack}

# hosting

host-self-as-condition-counter = l'héberger sur {$card-str} en tant que pion condition
host-card-on-card = héberger {$title} sur {$card-str}

# rezzing

rez-card = activer {$card-str}
derez-card = désactiver {$card-str}
derez-cards = désactiver {$card-strs}

# make a run

make-a-run = lancer un piratage
make-a-run-on = lancer un piratage sur {$server}
make-a-run-on-preventing-all-damage = lancer un piratage sur {$server} en prévenant tous les dégâts
run-on-with-no-rezzed-ice = lancer un piratage sur {$server} au cours duquel aucune glace ne peut être activée
rfg-to-make-a-run-on = retirer {$title} du jeu pour lancer un piratage sur {$server}

# redirect run

redirect-run-to-archives = remplacer le serveur attaqué par {-archives}
redirect-run-to-hq = remplacer le serveur attaqué par {-hq}
redirect-run-to-rd = remplacer le serveur attaqué par {-rd}

# icebreaker strength

give-strength-to-icebreaker-during-run = donner +{$bonus} en force à {$title} pendant le piratage
give-strength-to-icebreaker-remainder-of-run = donner +{$bonus} en force à {$card-str} pendant le reste du piratage
give-strength-all-icebreakers-during-run = donner +{$bonus} en force à tous les brise-glaces pendant le piratage

# ice

ice-gains-barrier-code-gate-sentry-end-of-turn = donner à {$card-str} les sous-types barrière, verrou et sentinelle jusqu'à la fin du tour

bypass-ice = contourner {$card-str}

prevent-run-ending = empêcher le piratage de prendre fin
prevent-ice-rezzed-during-run = empêcher l'activation de {-ice-type(number: "plural")} pendant le piratage
prevent-corp-rez-card-during-turn = empêcher {-corp(case:"nominative")} d'activer {$card-str} pour le reste du tour
prevent-corp-rez-non-ice-on-runner-turn = empêcher {-corp(case:"nominative")} d'activer des cartes autres que des glaces pendant le tour {-runner(case:"possessive")}

increase-rez-cost-first-unrezzed-approached-ice = augmenter de {$credits} {-credit} le coût d'activation de la première {-ice} désactivée approchée

# prevention

prevent-core-damage = prévenir {$count ->
    [one] {$count} dégât sévère
    *[other] {$count} dégâts sévères
}
prevent-meat-damage = prévenir {$count ->
    [one] {$count} dégât physique
    *[other] {$count} dégâts physiques
}
prevent-net-damage = prévenir {$count ->
    [one] {$count} dégât réseau
    *[other] {$count} dégâts réseau
}

prevent-corp-advancing-cards-next-turn = empêcher {-corp(case: "nominative")} d'avancer des cartes lors de son prochain tour

# Damage

suffer-meat-damage = subir {$value ->
    [one] {$value} dégât physique
    *[other] {$value} dégâts physiques
}
suffer-net-damage = subir {$value ->
    [one] {$value} dégât réseau
    *[other] {$value} dégâts réseau
}
suffer-brain-damage = subir {$value ->
    [one] {$value} dégât sévère
    *[other] {$value} dégâts sévères
}
suffer-core-damage = subir {$value ->
    [one] {$value} dégât sévère
    *[other] {$value} dégâts sévères
}

prevent-damage-until-next-turn = prévenir tous les dégâts jusqu'à son prochain tour

# Access

access-another-card = accéder à une autre carte
access-card = accéder à {$card-str}
access-additional-in-hq = accéder à {$count ->
    [one] {$count} carte supplémentaire dans {-hq}
    *[other] {$count} cartes supplémentaires dans {-hq}
}
access-additional-in-rd = accéder à {$count ->
    [one] {$count} carte supplémentaire dans {-rd}
    *[other] {$count} cartes supplémentaires dans {-rd}
}
access-from-bottom-of-rd = accéder aux cartes depuis le dessous {-rd(case: "possessive")}

# searching

search-stack-for-connection-resource = chercher une {-resource} connexion dans {-stack}
search-stack-for-run-event = chercher un {-event} piratage dans {-stack}
search-stack-for-virtual-resource = chercher une {-resource} virtuelle dans {-stack}

## Specific card abilities

# Apocalypse
trash-all-installed-corp = effacer toutes les cartes { -corp(case: "genitive") } installées

# Apocalypse
turn-all-installed-runner-facedown = retourner face cachée toutes les cartes { -runner(case: "genitive") } installées

# Rebirth

change-identity = changer d'identité pour {$title}

## Payments

payment-click = dépense {$value} {-click}
payment-credit = paie {$value} {-credit}
payment-x-credit = paie {$value} {-credit}
payment-credit-pool = paie {$value} {-credit} depuis sa {-credit-pool}
payment-hosted-credit = paie {$value} {-credit} depuis {$title}
payment-bad-publicity = paie {$value} {-credit} grâce à la { -bad-publicity }

payment-extend = efface {$title} {-hq(case: "possessive")}
payment-trash-can = [trash]
payment-trash-self = efface {$title}
payment-forfeit = renonce à {$count ->
    [0] 0 projet
    [one] 1 projet ({$titles})
    *[other] {$count} projets ({$titles})
}
payment-forfeit-self = renonce à {$title}

payment-gain-tags = prend {$count ->
    [one] {$count} tag
    *[other] {$count} tags
}
payment-tag = retire {$count ->
    [one] {$count} tag
    *[other] {$count} tags
}
payment-gain-bad-publicity = prend {$count ->
    [one] {$count} { -bad-publicity }
    *[other] {$count} { -bad-publicity(number: "plural") }
}
payment-return-to-grip = remet {$title} dans sa main
payment-return-to-hq = remet {$title} {-hq(case: "dative")}

payment-remove-from-game = retire {$title} du jeu
payment-rfg-program = retire du jeu {$count ->
    [0] 0 programme installé
    [one] 1 programme installé ({$titles})
    *[other] {$count} programmes installés ({$titles})
}
payment-trash-installed = efface {$count ->
    [0] 0 carte installée
    [one] 1 carte installée ({$titles})
    *[other] {$count} cartes installées ({$titles})
}
payment-trash-hardware = efface {$count ->
    [0] 0 matériel installé
    [one] 1 matériel installé ({$titles})
    *[other] {$count} matériels installés ({$titles})
}
payment-trash-program = efface {$count ->
    [0] 0 programme installé
    [one] 1 programme installé ({$titles})
    *[other] {$count} programmes installés ({$titles})
}
payment-trash-resource = efface {$count ->
    [0] 0 ressource installée
    [one] 1 ressource installée ({$titles})
    *[other] {$count} ressources installées ({$titles})
}
payment-trash-connection = efface {$count ->
    [0] 0 ressource connexion installée
    [one] 1 ressource connexion installée ({$titles})
    *[other] {$count} ressources connexion installées ({$titles})
}
payment-trash-ice = efface {$count ->
    [0] 0 {-ice-type} installée et activée
    [one] 1 {-ice-type} installée et activée ({$titles})
    *[other] {$count} {-ice-type(number: "plural")} installées et activées ({$titles})
}
payment-trash-bioroid = efface {$count ->
    [0] 0 bioroïde installé et activé
    [one] 1 bioroïde installé et activé ({$titles})
    *[other] {$count} bioroïdes installés et activés ({$titles})
}

payment-trash-from-stack = efface {$count ->
    [0] 0 carte du dessus {-stack(case: "possessive")}
    [one] la carte du dessus {-stack(case: "possessive")}
    *[other] les {$count} cartes du dessus {-stack(case: "possessive")}
}
payment-trash-from-rd = efface {$count ->
    [0] 0 carte du dessus {-rd(case: "possessive")}
    [one] la carte du dessus {-rd(case: "possessive")}
    *[other] les {$count} cartes du dessus {-rd(case: "possessive")}
}
payment-trash-from-grip = efface {$count ->
    [0] 0 carte {-grip(case: "possessive")}
    [one] 1 carte ({$titles}) {-grip(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-grip(case: "possessive")}
}
payment-trash-from-hq = efface {$count ->
    [0] 0 carte {-hq(case: "possessive")}
    [one] 1 carte {-hq(case: "possessive")}
    *[other] {$count} cartes {-hq(case: "possessive")}
}
payment-reveal-trash-from-grip = révèle et efface {$count ->
    [0] 0 carte {-grip(case: "possessive")}
    [one] 1 carte ({$titles}) {-grip(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-grip(case: "possessive")}
}
payment-reveal-trash-from-hq = révèle et efface {$count ->
    [0] 0 carte {-hq(case: "possessive")}
    [one] 1 carte ({$titles}) {-hq(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-hq(case: "possessive")}
}
payment-randomly-trash-from-grip = efface au hasard {$count ->
    [0] 0 carte {-grip(case: "possessive")}
    [one] 1 carte ({$titles}) {-grip(case: "possessive")}
    *[other] {$count} cartes ({$titles}) {-grip(case: "possessive")}
}
payment-randomly-trash-from-hq = efface au hasard {$count ->
    [0] 0 carte {-hq(case: "possessive")}
    [one] 1 carte {-hq(case: "possessive")}
    *[other] {$count} cartes {-hq(case: "possessive")}
}
payment-randomly-reveal-trash-from-grip = révèle et efface {$count ->
    [0] 0 carte {-grip(case: "possessive")}
    [one] 1 carte au hasard ({$titles}) {-grip(case: "possessive")}
    *[other] {$count} cartes au hasard ({$titles}) {-grip(case: "possessive")}
}
payment-randomly-reveal-trash-from-hq = révèle et efface {$count ->
    [0] 0 carte {-hq(case: "possessive")}
    [one] 1 carte au hasard ({$titles}) {-hq(case: "possessive")}
    *[other] {$count} cartes au hasard ({$titles}) {-hq(case: "possessive")}
}
payment-trash-all-cards-in-hq = efface toutes les cartes {-hq(case: "possessive")} ({$count} au total)
payment-trash-all-cards-in-grip = efface toutes les cartes {-grip(case: "possessive")} ({$count} au total : {$titles})

payment-trash-hardware-in-grip = efface {$count ->
    [0] 0 matériel {-grip(case: "possessive")}
    [one] 1 matériel {-grip(case: "possessive")} ({$titles})
    *[other] {$count} matériels {-grip(case: "possessive")} ({$titles})
}
payment-trash-program-in-grip = efface {$count ->
    [0] 0 programme {-grip(case: "possessive")}
    [one] 1 programme {-grip(case: "possessive")} ({$titles})
    *[other] {$count} programmes {-grip(case: "possessive")} ({$titles})
}
payment-trash-resource-in-grip = efface {$count ->
    [0] 0 ressource {-grip(case: "possessive")}
    [one] 1 ressource {-grip(case: "possessive")} ({$titles})
    *[other] {$count} ressources {-grip(case: "possessive")} ({$titles})
}

payment-meat = subit {$value ->
    [one] {$value} dégât physique
    *[other] {$value} dégâts physiques
}
payment-net = subit {$value ->
    [one] {$value} dégât réseau
    *[other] {$value} dégâts réseau
}
payment-core = subit {$value ->
    [one] {$value} dégât sévère
    *[other] {$value} dégâts sévères
}

payment-shuffle-installed-into-stack = mélange {$count ->
    [0] 0 carte dans {-stack}
    [one] 1 carte ({$titles}) dans {-stack}
    *[other] {$count} cartes ({$titles}) dans {-stack}
}
payment-shuffle-installed-into-rd = mélange {$count ->
    [one] {$count} carte dans {-rd}
    *[other] {$count} cartes dans {-rd}
}
payment-add-installed-bottom-stack = place {$count ->
    [0] 0 carte installée en dessous {-stack(case: "possessive")}
    [one] 1 carte installée ({$titles}) en dessous {-stack(case: "possessive")}
    *[other] {$count} cartes installées ({$titles}) en dessous {-stack(case: "possessive")}
}
payment-add-installed-bottom-rd = place {$count ->
    [0] 0 carte installée en dessous {-rd(case: "possessive")}
    [one] 1 carte installée ({$titles}) en dessous {-rd(case: "possessive")}
    *[other] {$count} cartes installées ({$titles}) en dessous {-rd(case: "possessive")}
}

payment-turn-hosted-matryoshka-facedown = retourne face cachée {$count ->
    [one] {$count} exemplaire hébergé de Matryoshka
    *[other] {$count} exemplaires hébergés de Matryoshka
}

payment-add-random-from-hand-to-bottom-of-stack = place {$count ->
    [one] {$count} carte au hasard en dessous {-stack(case: "possessive")}
    *[other] {$count} cartes au hasard en dessous {-stack(case: "possessive")}
}
payment-add-random-from-hand-to-bottom-of-rd = place {$count ->
    [one] {$count} carte au hasard en dessous {-rd(case: "possessive")}
    *[other] {$count} cartes au hasard en dessous {-rd(case: "possessive")}
}

payment-hosted-to-hq = ajoute {$count ->
    [0] 0 carte hébergée {-hq(case: "dative")}
    [one] 1 carte hébergée {-hq(case: "dative")} ({$titles})
    *[other] {$count} cartes hébergées {-hq(case: "dative")} ({$titles})
}

payment-advancement-counter = dépense {$count ->
    [one] {$count} pion avancement hébergé sur {$title}
    *[other] {$count} pions avancement hébergés sur {$title}
}
payment-agenda-counter = dépense {$count ->
    [one] {$count} pion projet hébergé sur {$title}
    *[other] {$count} pions projet hébergés sur {$title}
}
payment-power-counter = dépense {$count ->
    [one] {$count} pion pouvoir hébergé sur {$title}
    *[other] {$count} pions pouvoir hébergés sur {$title}
}
payment-virus-counter = dépense {$count ->
    [one] {$count} pion virus hébergé sur {$title}
    *[other] {$count} pions virus hébergés sur {$title}
}

payment-derez-harmonic = désactive {$count ->
    [one] {$count} {-ice-type} Harmonic ({$titles})
    *[other] {$count} {-ice-type(number: "plural")} Harmonic ({$titles})
}

## game.core.to-string/card-str

# it's one thing to say "uses Corroder", it's another to say "this specific Ice
# Wall on the table".

# "Corroder"
card-str-runner-seen = {$title}

# "Corroder installé"
card-str-runner-installed-seen = {$title} installé

# "une carte de la main"
card-str-runner-grip = une carte {-grip(case: "possessive")}

# "Corroder dans le tas"
card-str-runner-discard = {$title} dans {-heap}

# "une carte face cachée"
card-str-runner-unknown = une carte face cachée

# "Corroder hébergé"
card-str-runner-hosted-seen = {$title} hébergé

# "une carte hébergée face cachée"
card-str-runner-hosted-unknown = une carte hébergée face cachée

# "Merger dans la zone de score de lae Runner"
card-str-runner-scored = {$title} dans la zone de score {-runner(case: "possessive")}

# "Merger dans la zone de score de la Corpo"
card-str-corp-scored = {$title} dans la zone de score {-corp(case: "possessive")}
card-str-corp-rfg = {$title}, retiré du jeu
card-str-corp-play-area = {$title} dans la zone de jeu {-corp(case: "possessive")}
card-str-corp-destroyed = {$title}, détruit

# "Ice Wall hébergé"
card-str-corp-hosted-seen = {$title} hébergé
card-str-corp-hosted-known = {$title} hébergé face cachée
card-str-corp-hosted-unknown = une carte hébergée{$server ->
    [archives] {" "}à la racine {-archives(case: "possessive")}
    [hq] {" "}à la racine {-hq(case: "possessive")}
    [rd] {" "}à la racine {-rd(case: "possessive")}
    *[other] {" "}dans le serveur {$server-n}
}

# "NGO Front dans le serveur 5"
card-str-corp-installed-remote-seen = {$title} dans le serveur {$server-n}

# "Obokata Protocol face cachée dans le serveur 2"
card-str-corp-installed-remote-known = {$title} face cachée dans le serveur {$server-n}

# "une carte dans le serveur 1"
card-str-corp-installed-remote-unknown = une carte dans le serveur {$server-n}

# "Prisec à la racine du QG"
card-str-corp-installed-central-seen = {$server ->
    [archives] {$title} à la racine {-archives(case: "possessive")}
    [hq] {$title} à la racine {-hq(case: "possessive")}
    [rd] {$title} à la racine {-rd(case: "possessive")}
    *[other] serveur central inconnu ({$server})
}

# "Ryon Knight face cachée à la racine de R&D"
card-str-corp-installed-central-known = {$title} face cachée à la racine {$server ->
    [archives] {-archives(case: "possessive")}
    [hq] {-hq(case: "possessive")}
    [rd] {-rd(case: "possessive")}
    *[other] d'un serveur central inconnu ({$server})
}

# "une carte à la racine des Archives"
card-str-corp-installed-central-unknown = une carte à la racine {$server ->
    [archives] {-archives(case: "possessive")}
    [hq] {-hq(case: "possessive")}
    [rd] {-rd(case: "possessive")}
    *[other] d'un serveur central inconnu ({$server})
}

# "Ice Wall protégeant le QG en position 1"
card-str-corp-installed-ice-seen = {$title} protégeant {$server ->
    [archives] {-archives} en position {$position}
    [hq] {-hq} en position {$position}
    [rd] {-rd} en position {$position}
    *[other] le serveur {$server-n} en position {$position}
}

# "Ice Wall face cachée protégeant le QG en position 1"
card-str-corp-installed-ice-known = {$title} face cachée protégeant {$server ->
    [archives] {-archives} en position {$position}
    [hq] {-hq} en position {$position}
    [rd] {-rd} en position {$position}
    *[other] le serveur {$server-n} en position {$position}
}

# "une glace protégeant le QG en position 1"
card-str-corp-installed-ice-unknown = une {-ice-type} protégeant {$server ->
    [archives] {-archives} en position {$position}
    [hq] {-hq} en position {$position}
    [rd] {-rd} en position {$position}
    *[other] le serveur {$server-n} en position {$position}
}

### Standalone Messages

## Game End

tie = La partie se termine sur une égalité.
win = {$username} remporte la partie.
concede = {$username} abandonne.
win-decked = {$username} n'a plus de cartes à piocher.
win-flatline = {$username} est en flatline.
clear-win = {$username} a rempli la condition de victoire.

## Mulligan

mulligan-take = {$username} fait un mulligan.
mulligan-keep = {$username} garde sa main.

## Moving

msg-draw-cards = {$username} pioche {$count ->
    [0] 0 carte.
    [one] {$count} carte.
    *[other] {$count} cartes.
}

msg-forfeit-agenda = {$username} renonce à {$title}.

msg-trash-card = {$username} efface {$card-str}.

msg-trash-cards = {$username} efface {$count ->
    [0] 0 carte.
    [one] 1 carte ({$titles}).
    *[other] {$count} cartes ({$titles}).
}

msg-derez-card = {$username} désactive {$card-str}.

msg-rfg-n-cards-from-stack = {$username} retire du jeu {$count ->
    [one] la carte du dessus {-stack(case: "possessive")}.
    *[other] les {$count} cartes du dessus {-stack(case: "possessive")}.
}

## Traces

increase-trace-strength = {$username} {$payment} pour augmenter la force de la trace à {$value}.

## Turn messages

corp-start-of-turn = {$username} commence son tour {$turn} avec {$credits} {-credit} et {$cards ->
    [one] {$cards} carte dans { -hq }.
    *[other] {$cards} cartes dans { -hq }.
}
corp-end-of-turn = {$username} termine son tour {$turn} avec {$credits} {-credit} et {$cards ->
    [one] {$cards} carte dans { -hq }.
    *[other] {$cards} cartes dans { -hq }.
}

runner-start-of-turn = {$username} commence son tour {$turn} avec {$credits} {-credit} et {$cards ->
    [one] {$cards} carte en main.
    *[other] {$cards} cartes en main.
}
runner-end-of-turn = {$username} termine son tour {$turn} avec {$credits} {-credit} et {$cards ->
    [one] {$cards} carte en main.
    *[other] {$cards} cartes en main.
}

mandatory-start-of-turn-draw = {$username} effectue sa pioche obligatoire de début de tour.

no-further-actions = {$username} n'a plus d'actions à effectuer.

skip-discard-step = {$username} passe sa phase de défausse ce tour-ci.

corp-discard-cards-from-hand-eot = {$username} défausse {$cards ->
    [one] {$cards} carte { -hq(case: "possessive") } en fin de tour.
    *[other] {$cards} cartes { -hq(case: "possessive") } en fin de tour.
}
runner-discard-cards-from-hand-eot = {$username} défausse {$cards ->
    [one] {$cards} carte { -grip(case: "possessive") } en fin de tour.
    *[other] {$cards} cartes { -grip(case: "possessive") } en fin de tour.
}

extra-turns-remaining = {$username} aura encore {$turns ->
    [one] {$turns} tour supplémentaire.
    *[other] {$turns} tours supplémentaires.
}

## Waiting Prompts

waiting-corp-default = En attente d'une décision {-corp(case: "possessive")}.
waiting-runner-default = En attente d'une décision {-runner(case: "possessive")}.
waiting-trash-prevention-triggers = En attente que votre adversaire résolve les effets de prévention d'effacement.
waiting-pre-damage-triggers = En attente que votre adversaire résolve les effets déclenchés avant les dégâts.
waiting-damage-triggers = En attente que votre adversaire résolve les effets déclenchés par les dégâts.
waiting-prevent-when-encountered = En attente que votre adversaire empêche une capacité « lorsque rencontrée ».
waiting-prevent-run-ending = En attente que votre adversaire empêche le piratage de prendre fin.
waiting-prevent-jacking-out = En attente que votre adversaire vous empêche de vous déconnecter.
waiting-prevent-expose = En attente que votre adversaire empêche une exposition.
waiting-prevent-bad-publicity = En attente que votre adversaire prévienne la { -bad-publicity }.
waiting-prevent-tags = En attente que votre adversaire prévienne les tags.
