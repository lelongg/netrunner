# Learned evaluation fit

418459 positions from 27357 games · train 334095, holdout 84364 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.8 % |
| holdout | 0.548 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.8 % |
| turns 5-8 | 21318 | 0.585 | 69.3 % |
| turns 9-12 | 19428 | 0.517 | 74.5 % |
| turns 13+ | 21775 | 0.450 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.426 |
| deck:core-nbn | -0.254 |
| runnerPointsToWin | +0.200 |
| runnerPoints | -0.200 |
| points | +0.193 |
| pointsToWin | -0.193 |
| deck:core-weyland | +0.190 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.112 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.090 |
| runnerCoverage | -0.086 |
| runnerRig | -0.083 |
| deck | +0.082 |
| creditLead | +0.071 |
| agendaPointsInHand | -0.070 |
| remoteIce | +0.069 |
| oddsRD | -0.068 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.060 |
| threatLoss | -0.060 |
| runnerCredits | -0.054 |
| remotes | -0.051 |
| hqUnrezzed | +0.045 |
| credits | +0.041 |
| rezDebt | +0.039 |
| remoteUnrezzed | +0.039 |
| runnerTags | +0.039 |
| unfunded | -0.031 |
| hand | +0.029 |
| deck:core-criminal | +0.025 |
| rdIce | +0.023 |
| oddsRemote | +0.020 |
| oddsHQ | -0.017 |
| turn | -0.017 |
| economyAssets | +0.005 |
| runnerHand | +0.005 |
| deck:core-jinteki | -0.002 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
