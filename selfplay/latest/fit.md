# Learned evaluation fit

418176 positions from 27357 games · train 333979, holdout 84197 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21836 | 0.639 | 64.8 % |
| turns 5-8 | 21281 | 0.584 | 69.4 % |
| turns 9-12 | 19394 | 0.517 | 74.6 % |
| turns 13+ | 21686 | 0.452 | 78.5 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.426 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.197 |
| points | +0.194 |
| pointsToWin | -0.194 |
| threatGain | +0.174 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.111 |
| hqIce | +0.110 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.088 |
| runnerCoverage | -0.085 |
| runnerRig | -0.083 |
| deck | +0.083 |
| oddsRD | -0.069 |
| creditLead | +0.068 |
| agendaPointsInHand | -0.068 |
| deck:core-shaper | +0.064 |
| remoteIce | +0.064 |
| runnerBreakers | -0.062 |
| deck:core-hb | +0.060 |
| threatLoss | -0.058 |
| archivesAgendas | -0.058 |
| runnerCredits | -0.056 |
| remotes | -0.051 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.041 |
| runnerTags | +0.039 |
| rezDebt | +0.039 |
| credits | +0.037 |
| unfunded | -0.029 |
| hand | +0.028 |
| deck:core-criminal | +0.026 |
| rdIce | +0.021 |
| oddsRemote | +0.020 |
| oddsHQ | -0.018 |
| deck:core-jinteki | -0.009 |
| turn | -0.007 |
| economyAssets | -0.006 |
| runnerHand | +0.006 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
