# Learned evaluation fit

212587 positions from 13800 games · train 170228, holdout 42359 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.533 | 0.635 | 72.9 % | 66.9 % |
| holdout | 0.525 | 0.637 | 73.4 % | 66.5 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 10998 | 0.620 | 66.3 % |
| turns 5-8 | 10643 | 0.562 | 71.2 % |
| turns 9-12 | 9748 | 0.489 | 76.5 % |
| turns 13+ | 10970 | 0.426 | 79.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.407 |
| deck:core-nbn | -0.252 |
| runnerPointsToWin | +0.205 |
| runnerPoints | -0.205 |
| deck:core-weyland | +0.194 |
| points | +0.183 |
| pointsToWin | -0.183 |
| threatGain | +0.164 |
| remoteProgress | +0.130 |
| rdDensity | -0.130 |
| remoteAgendaPoints | +0.124 |
| hqIce | +0.119 |
| agendasInHand | -0.098 |
| deck:core-hb | +0.097 |
| deck | +0.095 |
| runnerCoverage | -0.095 |
| deck:core-shaper | +0.091 |
| deck:core-anarch | -0.088 |
| remotes | -0.078 |
| archivesAgendas | -0.069 |
| creditLead | +0.068 |
| agendaPointsInHand | -0.067 |
| oddsRD | -0.067 |
| runnerBreakers | -0.061 |
| runnerCredits | -0.054 |
| remoteIce | +0.054 |
| hqUnrezzed | +0.044 |
| runnerTags | +0.043 |
| deck:core-jinteki | -0.042 |
| threatLoss | -0.041 |
| credits | +0.038 |
| remoteUnrezzed | +0.037 |
| hand | +0.035 |
| rezDebt | +0.034 |
| rdIce | +0.031 |
| runnerRig | -0.030 |
| oddsRemote | +0.022 |
| unfunded | -0.018 |
| rdUnrezzed | -0.014 |
| economyAssets | +0.009 |
| turn | +0.009 |
| runnerHand | -0.006 |
| oddsHQ | -0.005 |
| deck:core-criminal | -0.004 |
| badPub | +0.000 |
