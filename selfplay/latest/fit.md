# Learned evaluation fit

418219 positions from 27357 games · train 334070, holdout 84149 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.8 % |
| holdout | 0.547 | 0.647 | 71.8 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.637 | 65.0 % |
| turns 5-8 | 21311 | 0.585 | 69.3 % |
| turns 9-12 | 19387 | 0.515 | 74.6 % |
| turns 13+ | 21608 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| pointsToWin | -0.192 |
| points | +0.192 |
| deck:core-weyland | +0.191 |
| threatGain | +0.174 |
| remoteProgress | +0.134 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.115 |
| rdDensity | -0.109 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.087 |
| deck | +0.084 |
| runnerRig | -0.081 |
| agendaPointsInHand | -0.071 |
| remoteIce | +0.070 |
| creditLead | +0.068 |
| oddsRD | -0.068 |
| deck:core-shaper | +0.065 |
| runnerBreakers | -0.063 |
| deck:core-hb | +0.063 |
| archivesAgendas | -0.059 |
| threatLoss | -0.057 |
| remotes | -0.055 |
| runnerCredits | -0.054 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.040 |
| credits | +0.037 |
| rezDebt | +0.036 |
| unfunded | -0.035 |
| hand | +0.029 |
| rdIce | +0.027 |
| deck:core-criminal | +0.024 |
| oddsRemote | +0.019 |
| oddsHQ | -0.019 |
| turn | -0.009 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.003 |
| economyAssets | +0.000 |
| badPub | +0.000 |
