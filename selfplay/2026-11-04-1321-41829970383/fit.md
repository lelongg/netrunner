# Learned evaluation fit

418304 positions from 27357 games · train 334028, holdout 84276 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.550 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.7 % |
| turns 5-8 | 21306 | 0.586 | 69.3 % |
| turns 9-12 | 19391 | 0.519 | 74.5 % |
| turns 13+ | 21736 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.197 |
| pointsToWin | -0.192 |
| points | +0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.115 |
| rdDensity | -0.110 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.087 |
| runnerCoverage | -0.087 |
| deck | +0.085 |
| runnerRig | -0.082 |
| remoteIce | +0.074 |
| agendaPointsInHand | -0.072 |
| oddsRD | -0.070 |
| creditLead | +0.067 |
| deck:core-hb | +0.065 |
| runnerBreakers | -0.062 |
| archivesAgendas | -0.060 |
| remotes | -0.059 |
| deck:core-shaper | +0.056 |
| threatLoss | -0.056 |
| runnerCredits | -0.054 |
| hqUnrezzed | +0.046 |
| remoteUnrezzed | +0.043 |
| runnerTags | +0.039 |
| credits | +0.037 |
| unfunded | -0.036 |
| rezDebt | +0.034 |
| deck:core-criminal | +0.030 |
| hand | +0.027 |
| rdIce | +0.026 |
| oddsRemote | +0.019 |
| oddsHQ | -0.016 |
| deck:core-jinteki | -0.012 |
| turn | -0.008 |
| economyAssets | -0.004 |
| runnerHand | +0.003 |
| rdUnrezzed | +0.002 |
| badPub | +0.000 |
