# Learned evaluation fit

418385 positions from 27357 games · train 334199, holdout 84186 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.552 | 0.650 | 71.6 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.641 | 64.7 % |
| turns 5-8 | 21302 | 0.587 | 69.2 % |
| turns 9-12 | 19391 | 0.520 | 74.3 % |
| turns 13+ | 21650 | 0.455 | 78.4 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.197 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.113 |
| rdDensity | -0.108 |
| deck:core-anarch | -0.088 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.083 |
| runnerRig | -0.083 |
| deck | +0.081 |
| oddsRD | -0.071 |
| remoteIce | +0.069 |
| creditLead | +0.068 |
| agendaPointsInHand | -0.066 |
| deck:core-hb | +0.064 |
| archivesAgendas | -0.063 |
| deck:core-shaper | +0.063 |
| runnerBreakers | -0.058 |
| runnerCredits | -0.055 |
| threatLoss | -0.055 |
| remotes | -0.051 |
| hqUnrezzed | +0.042 |
| runnerTags | +0.040 |
| credits | +0.036 |
| remoteUnrezzed | +0.036 |
| unfunded | -0.034 |
| rezDebt | +0.032 |
| hand | +0.027 |
| rdIce | +0.024 |
| deck:core-criminal | +0.024 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| deck:core-jinteki | -0.009 |
| turn | -0.009 |
| economyAssets | -0.008 |
| runnerHand | +0.004 |
| rdUnrezzed | +0.001 |
| badPub | +0.000 |
