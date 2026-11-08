# Learned evaluation fit

418367 positions from 27357 games · train 334152, holdout 84215 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.550 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.7 % |
| turns 5-8 | 21316 | 0.587 | 69.2 % |
| turns 9-12 | 19400 | 0.518 | 74.6 % |
| turns 13+ | 21656 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| deck:core-weyland | +0.196 |
| points | +0.195 |
| pointsToWin | -0.195 |
| threatGain | +0.177 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.113 |
| hqIce | +0.113 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.089 |
| runnerRig | -0.085 |
| deck | +0.085 |
| runnerCoverage | -0.084 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| remoteIce | +0.067 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.061 |
| deck:core-hb | +0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.058 |
| runnerCredits | -0.053 |
| remotes | -0.050 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.042 |
| credits | +0.039 |
| runnerTags | +0.039 |
| rezDebt | +0.034 |
| unfunded | -0.034 |
| hand | +0.027 |
| rdIce | +0.026 |
| deck:core-criminal | +0.026 |
| oddsHQ | -0.022 |
| oddsRemote | +0.017 |
| turn | -0.015 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.000 |
| economyAssets | +0.000 |
| badPub | +0.000 |
