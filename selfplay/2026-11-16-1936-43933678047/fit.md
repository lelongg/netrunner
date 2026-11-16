# Learned evaluation fit

417938 positions from 27357 games · train 333906, holdout 84032 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.552 | 0.650 | 71.5 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21835 | 0.641 | 64.6 % |
| turns 5-8 | 21289 | 0.589 | 68.9 % |
| turns 9-12 | 19385 | 0.522 | 74.2 % |
| turns 13+ | 21523 | 0.453 | 78.5 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.260 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.198 |
| points | +0.194 |
| pointsToWin | -0.194 |
| threatGain | +0.176 |
| remoteProgress | +0.134 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.112 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.090 |
| runnerRig | -0.088 |
| deck | +0.085 |
| runnerCoverage | -0.085 |
| oddsRD | -0.072 |
| agendaPointsInHand | -0.071 |
| remoteIce | +0.070 |
| creditLead | +0.069 |
| deck:core-shaper | +0.065 |
| deck:core-hb | +0.065 |
| runnerBreakers | -0.060 |
| archivesAgendas | -0.059 |
| threatLoss | -0.057 |
| runnerCredits | -0.051 |
| remotes | -0.050 |
| remoteUnrezzed | +0.042 |
| credits | +0.040 |
| hqUnrezzed | +0.040 |
| runnerTags | +0.038 |
| rezDebt | +0.037 |
| unfunded | -0.032 |
| hand | +0.028 |
| deck:core-criminal | +0.024 |
| rdIce | +0.024 |
| oddsHQ | -0.016 |
| oddsRemote | +0.016 |
| turn | -0.009 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.004 |
| economyAssets | -0.004 |
| rdUnrezzed | -0.002 |
| badPub | +0.000 |
