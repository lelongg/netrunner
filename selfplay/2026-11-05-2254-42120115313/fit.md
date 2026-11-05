# Learned evaluation fit

417865 positions from 27357 games · train 333735, holdout 84130 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.647 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.638 | 65.0 % |
| turns 5-8 | 21312 | 0.586 | 69.3 % |
| turns 9-12 | 19389 | 0.516 | 74.5 % |
| turns 13+ | 21588 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.256 |
| runnerPointsToWin | +0.199 |
| runnerPoints | -0.199 |
| deck:core-weyland | +0.193 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.111 |
| agendasInHand | -0.092 |
| deck:core-anarch | -0.091 |
| runnerRig | -0.088 |
| runnerCoverage | -0.087 |
| deck | +0.083 |
| remoteIce | +0.072 |
| creditLead | +0.070 |
| agendaPointsInHand | -0.070 |
| oddsRD | -0.068 |
| deck:core-hb | +0.067 |
| deck:core-shaper | +0.063 |
| archivesAgendas | -0.063 |
| runnerBreakers | -0.060 |
| threatLoss | -0.059 |
| remotes | -0.055 |
| runnerCredits | -0.053 |
| credits | +0.041 |
| runnerTags | +0.041 |
| hqUnrezzed | +0.040 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.036 |
| unfunded | -0.034 |
| rdIce | +0.029 |
| hand | +0.028 |
| deck:core-criminal | +0.026 |
| oddsRemote | +0.020 |
| oddsHQ | -0.018 |
| turn | -0.012 |
| deck:core-jinteki | -0.008 |
| runnerHand | +0.003 |
| economyAssets | -0.003 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
