# Learned evaluation fit

194411 positions from 12600 games · train 155698, holdout 38713 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.531 | 0.633 | 73.1 % | 67.1 % |
| holdout | 0.525 | 0.635 | 73.4 % | 66.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 10042 | 0.619 | 66.4 % |
| turns 5-8 | 9720 | 0.564 | 71.0 % |
| turns 9-12 | 8906 | 0.490 | 76.3 % |
| turns 13+ | 10045 | 0.425 | 80.1 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.407 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.190 |
| pointsToWin | -0.185 |
| points | +0.185 |
| threatGain | +0.164 |
| rdDensity | -0.130 |
| remoteProgress | +0.127 |
| hqIce | +0.126 |
| remoteAgendaPoints | +0.124 |
| deck:core-hb | +0.105 |
| runnerCoverage | -0.101 |
| agendasInHand | -0.094 |
| deck | +0.093 |
| deck:core-shaper | +0.091 |
| deck:core-anarch | -0.084 |
| remotes | -0.083 |
| creditLead | +0.070 |
| archivesAgendas | -0.067 |
| runnerBreakers | -0.066 |
| oddsRD | -0.065 |
| agendaPointsInHand | -0.064 |
| remoteIce | +0.053 |
| runnerCredits | -0.052 |
| hqUnrezzed | +0.046 |
| runnerTags | +0.045 |
| deck:core-jinteki | -0.044 |
| threatLoss | -0.041 |
| credits | +0.041 |
| hand | +0.036 |
| rezDebt | +0.036 |
| remoteUnrezzed | +0.032 |
| rdIce | +0.031 |
| runnerRig | -0.026 |
| oddsRemote | +0.026 |
| unfunded | -0.018 |
| economyAssets | +0.016 |
| rdUnrezzed | -0.016 |
| runnerHand | -0.009 |
| deck:core-criminal | -0.008 |
| oddsHQ | -0.003 |
| turn | +0.000 |
| badPub | +0.000 |
