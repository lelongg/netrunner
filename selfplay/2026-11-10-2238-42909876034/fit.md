# Learned evaluation fit

418231 positions from 27357 games · train 334144, holdout 84087 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.551 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.639 | 64.9 % |
| turns 5-8 | 21302 | 0.587 | 69.2 % |
| turns 9-12 | 19367 | 0.519 | 74.4 % |
| turns 13+ | 21576 | 0.454 | 78.4 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.258 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.196 |
| pointsToWin | -0.190 |
| points | +0.190 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.094 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.086 |
| deck | +0.084 |
| runnerRig | -0.082 |
| remoteIce | +0.069 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.067 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.063 |
| deck:core-hb | +0.062 |
| runnerBreakers | -0.060 |
| threatLoss | -0.059 |
| runnerCredits | -0.052 |
| remotes | -0.051 |
| remoteUnrezzed | +0.042 |
| hqUnrezzed | +0.041 |
| runnerTags | +0.040 |
| credits | +0.038 |
| rezDebt | +0.034 |
| unfunded | -0.033 |
| rdIce | +0.030 |
| hand | +0.029 |
| deck:core-criminal | +0.029 |
| oddsHQ | -0.020 |
| oddsRemote | +0.018 |
| turn | -0.009 |
| economyAssets | -0.006 |
| runnerHand | +0.005 |
| deck:core-jinteki | -0.004 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
