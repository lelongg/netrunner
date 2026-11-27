# Learned evaluation fit

418379 positions from 27357 games · train 334296, holdout 84083 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.647 | 71.9 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21838 | 0.638 | 64.9 % |
| turns 5-8 | 21299 | 0.585 | 69.4 % |
| turns 9-12 | 19376 | 0.515 | 74.7 % |
| turns 13+ | 21570 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.255 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| pointsToWin | -0.195 |
| points | +0.195 |
| deck:core-weyland | +0.188 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.112 |
| hqIce | +0.112 |
| runnerCoverage | -0.090 |
| agendasInHand | -0.088 |
| deck:core-anarch | -0.088 |
| deck | +0.086 |
| runnerRig | -0.085 |
| oddsRD | -0.071 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.070 |
| remoteIce | +0.070 |
| archivesAgendas | -0.065 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.063 |
| deck:core-shaper | +0.063 |
| threatLoss | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.048 |
| hqUnrezzed | +0.044 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.041 |
| credits | +0.040 |
| rezDebt | +0.035 |
| unfunded | -0.030 |
| rdIce | +0.028 |
| hand | +0.027 |
| deck:core-criminal | +0.024 |
| oddsRemote | +0.019 |
| oddsHQ | -0.019 |
| turn | -0.010 |
| runnerHand | +0.006 |
| economyAssets | -0.004 |
| deck:core-jinteki | -0.002 |
| rdUnrezzed | +0.001 |
| badPub | +0.000 |
