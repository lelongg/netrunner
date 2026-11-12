# Learned evaluation fit

418471 positions from 27357 games · train 334361, holdout 84110 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.550 | 0.648 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.8 % |
| turns 5-8 | 21317 | 0.587 | 69.1 % |
| turns 9-12 | 19381 | 0.518 | 74.5 % |
| turns 13+ | 21569 | 0.450 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.258 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.194 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.115 |
| hqIce | +0.112 |
| runnerRig | -0.092 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.088 |
| deck | +0.086 |
| runnerCoverage | -0.085 |
| remoteIce | +0.073 |
| creditLead | +0.071 |
| agendaPointsInHand | -0.070 |
| oddsRD | -0.067 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.066 |
| archivesAgendas | -0.059 |
| threatLoss | -0.059 |
| runnerBreakers | -0.058 |
| runnerCredits | -0.055 |
| remotes | -0.048 |
| hqUnrezzed | +0.041 |
| credits | +0.040 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.040 |
| rezDebt | +0.036 |
| unfunded | -0.033 |
| hand | +0.030 |
| rdIce | +0.028 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.021 |
| oddsHQ | -0.019 |
| turn | -0.014 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.005 |
| economyAssets | -0.003 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
