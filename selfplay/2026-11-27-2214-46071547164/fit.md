# Learned evaluation fit

417946 positions from 27357 games · train 333887, holdout 84059 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.8 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.639 | 64.8 % |
| turns 5-8 | 21298 | 0.586 | 69.3 % |
| turns 9-12 | 19335 | 0.517 | 74.7 % |
| turns 13+ | 21585 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.253 |
| runnerPointsToWin | +0.204 |
| runnerPoints | -0.204 |
| deck:core-weyland | +0.197 |
| points | +0.191 |
| pointsToWin | -0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.113 |
| rdDensity | -0.110 |
| deck:core-anarch | -0.089 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.086 |
| deck | +0.083 |
| runnerRig | -0.082 |
| remoteIce | +0.071 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.067 |
| oddsRD | -0.067 |
| runnerBreakers | -0.063 |
| deck:core-hb | +0.061 |
| archivesAgendas | -0.059 |
| deck:core-shaper | +0.059 |
| threatLoss | -0.056 |
| runnerCredits | -0.053 |
| remotes | -0.053 |
| remoteUnrezzed | +0.041 |
| hqUnrezzed | +0.041 |
| rezDebt | +0.038 |
| runnerTags | +0.038 |
| credits | +0.037 |
| unfunded | -0.031 |
| deck:core-criminal | +0.030 |
| rdIce | +0.027 |
| hand | +0.026 |
| oddsRemote | +0.017 |
| oddsHQ | -0.016 |
| turn | -0.009 |
| deck:core-jinteki | -0.009 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.002 |
| economyAssets | -0.001 |
| badPub | +0.000 |
