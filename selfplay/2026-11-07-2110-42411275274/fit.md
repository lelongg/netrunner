# Learned evaluation fit

418067 positions from 27357 games · train 333878, holdout 84189 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.548 | 0.647 | 71.9 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.9 % |
| turns 5-8 | 21314 | 0.584 | 69.5 % |
| turns 9-12 | 19391 | 0.516 | 74.6 % |
| turns 13+ | 21642 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.255 |
| runnerPointsToWin | +0.205 |
| runnerPoints | -0.205 |
| deck:core-weyland | +0.194 |
| points | +0.189 |
| pointsToWin | -0.189 |
| threatGain | +0.173 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.115 |
| rdDensity | -0.110 |
| deck:core-anarch | -0.092 |
| agendasInHand | -0.090 |
| runnerRig | -0.086 |
| runnerCoverage | -0.084 |
| deck | +0.082 |
| agendaPointsInHand | -0.072 |
| oddsRD | -0.071 |
| remoteIce | +0.070 |
| creditLead | +0.068 |
| deck:core-hb | +0.066 |
| deck:core-shaper | +0.065 |
| archivesAgendas | -0.060 |
| runnerBreakers | -0.059 |
| threatLoss | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.053 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.038 |
| remoteUnrezzed | +0.038 |
| credits | +0.037 |
| rezDebt | +0.037 |
| unfunded | -0.029 |
| hand | +0.029 |
| deck:core-criminal | +0.027 |
| rdIce | +0.026 |
| oddsRemote | +0.018 |
| oddsHQ | -0.018 |
| deck:core-jinteki | -0.009 |
| rdUnrezzed | -0.006 |
| economyAssets | -0.006 |
| turn | -0.004 |
| runnerHand | +0.004 |
| badPub | +0.000 |
