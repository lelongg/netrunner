# Learned evaluation fit

418389 positions from 27357 games · train 334137, holdout 84252 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.639 | 64.8 % |
| turns 5-8 | 21297 | 0.586 | 69.3 % |
| turns 9-12 | 19405 | 0.518 | 74.4 % |
| turns 13+ | 21708 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.257 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| pointsToWin | -0.192 |
| points | +0.192 |
| deck:core-weyland | +0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.117 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.088 |
| runnerRig | -0.087 |
| deck | +0.084 |
| remoteIce | +0.070 |
| creditLead | +0.069 |
| agendaPointsInHand | -0.069 |
| deck:core-shaper | +0.068 |
| oddsRD | -0.066 |
| archivesAgendas | -0.066 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.062 |
| threatLoss | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.051 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.043 |
| credits | +0.039 |
| runnerTags | +0.036 |
| rezDebt | +0.034 |
| unfunded | -0.032 |
| rdIce | +0.030 |
| hand | +0.027 |
| deck:core-criminal | +0.021 |
| oddsHQ | -0.020 |
| oddsRemote | +0.019 |
| turn | -0.011 |
| rdUnrezzed | -0.005 |
| runnerHand | +0.004 |
| economyAssets | -0.003 |
| deck:core-jinteki | -0.002 |
| badPub | +0.000 |
