# Learned evaluation fit

418190 positions from 27357 games · train 333916, holdout 84274 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.5 % |
| holdout | 0.548 | 0.647 | 71.8 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21840 | 0.638 | 65.0 % |
| turns 5-8 | 21308 | 0.585 | 69.3 % |
| turns 9-12 | 19403 | 0.515 | 74.7 % |
| turns 13+ | 21723 | 0.449 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.254 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| points | +0.194 |
| pointsToWin | -0.194 |
| deck:core-weyland | +0.189 |
| threatGain | +0.175 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.113 |
| rdDensity | -0.109 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.089 |
| runnerRig | -0.086 |
| runnerCoverage | -0.086 |
| deck | +0.082 |
| remoteIce | +0.072 |
| creditLead | +0.070 |
| oddsRD | -0.070 |
| agendaPointsInHand | -0.069 |
| deck:core-hb | +0.066 |
| deck:core-shaper | +0.063 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.059 |
| threatLoss | -0.059 |
| remotes | -0.056 |
| runnerCredits | -0.055 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.040 |
| credits | +0.040 |
| rezDebt | +0.037 |
| hand | +0.031 |
| unfunded | -0.031 |
| deck:core-criminal | +0.027 |
| rdIce | +0.025 |
| oddsRemote | +0.021 |
| oddsHQ | -0.019 |
| turn | -0.011 |
| economyAssets | -0.009 |
| runnerHand | +0.005 |
| deck:core-jinteki | -0.005 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
