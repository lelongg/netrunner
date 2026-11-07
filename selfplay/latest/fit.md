# Learned evaluation fit

418209 positions from 27357 games · train 334048, holdout 84161 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21835 | 0.639 | 64.7 % |
| turns 5-8 | 21298 | 0.586 | 69.2 % |
| turns 9-12 | 19389 | 0.517 | 74.5 % |
| turns 13+ | 21639 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.426 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.193 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.175 |
| remoteProgress | +0.130 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.111 |
| agendasInHand | -0.091 |
| runnerCoverage | -0.089 |
| deck:core-anarch | -0.088 |
| runnerRig | -0.084 |
| deck | +0.080 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| oddsRD | -0.067 |
| remoteIce | +0.066 |
| deck:core-shaper | +0.063 |
| deck:core-hb | +0.062 |
| threatLoss | -0.060 |
| runnerBreakers | -0.060 |
| archivesAgendas | -0.060 |
| remotes | -0.054 |
| runnerCredits | -0.052 |
| hqUnrezzed | +0.043 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.041 |
| credits | +0.039 |
| rezDebt | +0.038 |
| unfunded | -0.032 |
| hand | +0.028 |
| rdIce | +0.025 |
| deck:core-criminal | +0.024 |
| oddsRemote | +0.020 |
| oddsHQ | -0.016 |
| turn | -0.008 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.001 |
| economyAssets | -0.001 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
