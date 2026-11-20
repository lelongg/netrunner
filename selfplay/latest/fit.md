# Learned evaluation fit

418212 positions from 27357 games · train 334010, holdout 84202 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.550 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21838 | 0.639 | 64.9 % |
| turns 5-8 | 21299 | 0.586 | 69.3 % |
| turns 9-12 | 19396 | 0.518 | 74.5 % |
| turns 13+ | 21669 | 0.455 | 78.2 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.255 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| points | +0.193 |
| pointsToWin | -0.193 |
| deck:core-weyland | +0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.115 |
| hqIce | +0.111 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.089 |
| runnerRig | -0.086 |
| deck | +0.085 |
| runnerCoverage | -0.084 |
| remoteIce | +0.069 |
| agendaPointsInHand | -0.069 |
| oddsRD | -0.069 |
| creditLead | +0.067 |
| deck:core-hb | +0.066 |
| deck:core-shaper | +0.062 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.060 |
| threatLoss | -0.059 |
| runnerCredits | -0.054 |
| remotes | -0.052 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.039 |
| runnerTags | +0.039 |
| credits | +0.036 |
| rezDebt | +0.034 |
| unfunded | -0.034 |
| deck:core-criminal | +0.031 |
| rdIce | +0.028 |
| hand | +0.028 |
| oddsHQ | -0.022 |
| oddsRemote | +0.021 |
| turn | -0.009 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.006 |
| runnerHand | +0.004 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
