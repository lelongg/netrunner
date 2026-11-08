# Learned evaluation fit

418372 positions from 27357 games · train 334098, holdout 84274 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.8 % |
| holdout | 0.549 | 0.647 | 71.7 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 64.9 % |
| turns 5-8 | 21313 | 0.586 | 69.2 % |
| turns 9-12 | 19391 | 0.519 | 74.4 % |
| turns 13+ | 21727 | 0.451 | 78.5 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.261 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.194 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| rdDensity | -0.114 |
| hqIce | +0.111 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.086 |
| deck:core-anarch | -0.086 |
| deck | +0.085 |
| runnerRig | -0.082 |
| remoteIce | +0.072 |
| oddsRD | -0.071 |
| creditLead | +0.068 |
| agendaPointsInHand | -0.068 |
| deck:core-hb | +0.065 |
| deck:core-shaper | +0.060 |
| runnerBreakers | -0.060 |
| threatLoss | -0.059 |
| archivesAgendas | -0.058 |
| runnerCredits | -0.054 |
| remotes | -0.051 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.038 |
| credits | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.032 |
| hand | +0.028 |
| rdIce | +0.025 |
| deck:core-criminal | +0.025 |
| oddsRemote | +0.019 |
| oddsHQ | -0.017 |
| turn | -0.009 |
| economyAssets | +0.005 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.002 |
| deck:core-jinteki | -0.002 |
| badPub | +0.000 |
