# Learned evaluation fit

418050 positions from 27357 games · train 333907, holdout 84143 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.546 | 0.647 | 72.0 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21838 | 0.636 | 65.1 % |
| turns 5-8 | 21300 | 0.583 | 69.5 % |
| turns 9-12 | 19400 | 0.514 | 74.8 % |
| turns 13+ | 21605 | 0.448 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.255 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| deck:core-weyland | +0.193 |
| points | +0.191 |
| pointsToWin | -0.191 |
| threatGain | +0.174 |
| remoteProgress | +0.135 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.116 |
| rdDensity | -0.113 |
| agendasInHand | -0.091 |
| deck:core-anarch | -0.088 |
| runnerCoverage | -0.087 |
| runnerRig | -0.085 |
| deck | +0.085 |
| agendaPointsInHand | -0.070 |
| creditLead | +0.069 |
| remoteIce | +0.068 |
| deck:core-hb | +0.066 |
| oddsRD | -0.066 |
| runnerBreakers | -0.065 |
| deck:core-shaper | +0.063 |
| archivesAgendas | -0.061 |
| threatLoss | -0.057 |
| runnerCredits | -0.056 |
| remotes | -0.045 |
| remoteUnrezzed | +0.045 |
| hqUnrezzed | +0.040 |
| runnerTags | +0.039 |
| credits | +0.038 |
| rezDebt | +0.034 |
| unfunded | -0.032 |
| hand | +0.030 |
| rdIce | +0.027 |
| deck:core-criminal | +0.024 |
| oddsHQ | -0.021 |
| oddsRemote | +0.018 |
| deck:core-jinteki | -0.009 |
| turn | -0.008 |
| economyAssets | -0.004 |
| runnerHand | +0.003 |
| rdUnrezzed | +0.002 |
| badPub | +0.000 |
