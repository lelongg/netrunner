# Learned evaluation fit

418123 positions from 27357 games · train 333840, holdout 84283 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.639 | 64.8 % |
| turns 5-8 | 21303 | 0.586 | 69.1 % |
| turns 9-12 | 19408 | 0.518 | 74.5 % |
| turns 13+ | 21731 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| pointsToWin | -0.192 |
| points | +0.192 |
| deck:core-weyland | +0.192 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| rdDensity | -0.111 |
| hqIce | +0.111 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.090 |
| runnerCoverage | -0.087 |
| deck | +0.084 |
| runnerRig | -0.080 |
| remoteIce | +0.075 |
| agendaPointsInHand | -0.070 |
| oddsRD | -0.067 |
| deck:core-hb | +0.067 |
| creditLead | +0.065 |
| deck:core-shaper | +0.063 |
| runnerBreakers | -0.063 |
| archivesAgendas | -0.060 |
| threatLoss | -0.057 |
| remotes | -0.055 |
| runnerCredits | -0.052 |
| hqUnrezzed | +0.048 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.039 |
| credits | +0.035 |
| unfunded | -0.035 |
| rezDebt | +0.033 |
| rdIce | +0.029 |
| deck:core-criminal | +0.029 |
| hand | +0.029 |
| oddsHQ | -0.020 |
| oddsRemote | +0.018 |
| economyAssets | -0.009 |
| deck:core-jinteki | -0.009 |
| turn | -0.007 |
| runnerHand | +0.003 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
