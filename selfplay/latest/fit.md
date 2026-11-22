# Learned evaluation fit

418375 positions from 27357 games · train 334037, holdout 84338 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.9 % |
| turns 5-8 | 21319 | 0.586 | 69.3 % |
| turns 9-12 | 19431 | 0.518 | 74.4 % |
| turns 13+ | 21746 | 0.451 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| pointsToWin | -0.193 |
| points | +0.193 |
| deck:core-weyland | +0.191 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.128 |
| hqIce | +0.115 |
| rdDensity | -0.112 |
| agendasInHand | -0.092 |
| deck:core-anarch | -0.090 |
| runnerRig | -0.088 |
| deck | +0.086 |
| runnerCoverage | -0.083 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.070 |
| remoteIce | +0.069 |
| oddsRD | -0.069 |
| deck:core-shaper | +0.065 |
| archivesAgendas | -0.065 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.060 |
| threatLoss | -0.058 |
| runnerCredits | -0.053 |
| remotes | -0.053 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.042 |
| credits | +0.040 |
| runnerTags | +0.039 |
| unfunded | -0.035 |
| rezDebt | +0.034 |
| hand | +0.031 |
| rdIce | +0.028 |
| deck:core-criminal | +0.024 |
| oddsHQ | -0.021 |
| oddsRemote | +0.020 |
| turn | -0.010 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.002 |
| economyAssets | -0.001 |
| badPub | +0.000 |
