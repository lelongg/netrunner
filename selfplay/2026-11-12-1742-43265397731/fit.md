# Learned evaluation fit

418306 positions from 27357 games · train 334004, holdout 84302 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.550 | 0.650 | 71.7 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.8 % |
| turns 5-8 | 21315 | 0.587 | 69.2 % |
| turns 9-12 | 19411 | 0.520 | 74.4 % |
| turns 13+ | 21733 | 0.452 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.195 |
| pointsToWin | -0.194 |
| points | +0.194 |
| threatGain | +0.175 |
| remoteAgendaPoints | +0.130 |
| remoteProgress | +0.129 |
| hqIce | +0.113 |
| rdDensity | -0.112 |
| agendasInHand | -0.091 |
| deck:core-anarch | -0.090 |
| runnerRig | -0.087 |
| runnerCoverage | -0.085 |
| deck | +0.084 |
| remoteIce | +0.072 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.068 |
| oddsRD | -0.066 |
| deck:core-hb | +0.064 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.063 |
| runnerBreakers | -0.060 |
| threatLoss | -0.056 |
| remotes | -0.055 |
| runnerCredits | -0.055 |
| hqUnrezzed | +0.046 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.038 |
| credits | +0.037 |
| unfunded | -0.032 |
| hand | +0.029 |
| rdIce | +0.026 |
| deck:core-criminal | +0.025 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.009 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.006 |
| runnerHand | +0.004 |
| rdUnrezzed | +0.001 |
| badPub | +0.000 |
