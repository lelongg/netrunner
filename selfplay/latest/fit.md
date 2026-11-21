# Learned evaluation fit

418187 positions from 27357 games · train 334210, holdout 83977 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.8 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21838 | 0.639 | 64.8 % |
| turns 5-8 | 21288 | 0.585 | 69.2 % |
| turns 9-12 | 19371 | 0.516 | 74.6 % |
| turns 13+ | 21480 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.257 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| deck:core-weyland | +0.194 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.134 |
| remoteAgendaPoints | +0.129 |
| rdDensity | -0.114 |
| hqIce | +0.113 |
| deck:core-anarch | -0.092 |
| deck | +0.088 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.086 |
| runnerRig | -0.083 |
| oddsRD | -0.069 |
| creditLead | +0.069 |
| agendaPointsInHand | -0.067 |
| remoteIce | +0.067 |
| deck:core-shaper | +0.066 |
| archivesAgendas | -0.063 |
| deck:core-hb | +0.062 |
| threatLoss | -0.060 |
| runnerBreakers | -0.060 |
| runnerCredits | -0.050 |
| remotes | -0.047 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.041 |
| credits | +0.041 |
| runnerTags | +0.039 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| rdIce | +0.028 |
| hand | +0.026 |
| deck:core-criminal | +0.025 |
| oddsHQ | -0.018 |
| oddsRemote | +0.018 |
| turn | -0.014 |
| runnerHand | +0.007 |
| rdUnrezzed | -0.006 |
| deck:core-jinteki | -0.003 |
| economyAssets | +0.002 |
| badPub | +0.000 |
