# Learned evaluation fit

418063 positions from 27357 games · train 333797, holdout 84266 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.550 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.7 % |
| turns 5-8 | 21311 | 0.588 | 69.1 % |
| turns 9-12 | 19414 | 0.518 | 74.5 % |
| turns 13+ | 21698 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| pointsToWin | -0.194 |
| points | +0.194 |
| deck:core-weyland | +0.190 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.113 |
| rdDensity | -0.112 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| runnerRig | -0.089 |
| runnerCoverage | -0.085 |
| deck | +0.081 |
| agendaPointsInHand | -0.070 |
| creditLead | +0.068 |
| deck:core-hb | +0.066 |
| remoteIce | +0.066 |
| oddsRD | -0.065 |
| runnerBreakers | -0.061 |
| deck:core-shaper | +0.060 |
| threatLoss | -0.059 |
| archivesAgendas | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.048 |
| hqUnrezzed | +0.044 |
| runnerTags | +0.042 |
| remoteUnrezzed | +0.041 |
| rezDebt | +0.039 |
| credits | +0.037 |
| hand | +0.031 |
| unfunded | -0.030 |
| deck:core-criminal | +0.028 |
| rdIce | +0.023 |
| oddsHQ | -0.020 |
| oddsRemote | +0.017 |
| turn | -0.012 |
| economyAssets | -0.006 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.001 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
