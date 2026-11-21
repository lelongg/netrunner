# Learned evaluation fit

418185 positions from 27357 games · train 334202, holdout 83983 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.551 | 0.649 | 71.6 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21839 | 0.641 | 64.5 % |
| turns 5-8 | 21296 | 0.587 | 69.2 % |
| turns 9-12 | 19353 | 0.519 | 74.4 % |
| turns 13+ | 21495 | 0.453 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.432 |
| deck:core-nbn | -0.253 |
| runnerPointsToWin | +0.201 |
| runnerPoints | -0.201 |
| pointsToWin | -0.196 |
| points | +0.196 |
| deck:core-weyland | +0.192 |
| threatGain | +0.176 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.114 |
| rdDensity | -0.112 |
| deck:core-anarch | -0.088 |
| agendasInHand | -0.086 |
| runnerRig | -0.086 |
| runnerCoverage | -0.085 |
| deck | +0.085 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| oddsRD | -0.068 |
| deck:core-hb | +0.065 |
| remoteIce | +0.064 |
| archivesAgendas | -0.062 |
| runnerBreakers | -0.060 |
| deck:core-shaper | +0.059 |
| threatLoss | -0.058 |
| runnerCredits | -0.054 |
| remotes | -0.050 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.043 |
| runnerTags | +0.039 |
| credits | +0.038 |
| rezDebt | +0.036 |
| unfunded | -0.031 |
| deck:core-criminal | +0.028 |
| hand | +0.028 |
| rdIce | +0.023 |
| oddsHQ | -0.020 |
| oddsRemote | +0.018 |
| turn | -0.013 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
