# Learned evaluation fit

418344 positions from 27357 games · train 334142, holdout 84202 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.548 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 64.8 % |
| turns 5-8 | 21324 | 0.584 | 69.4 % |
| turns 9-12 | 19420 | 0.516 | 74.7 % |
| turns 13+ | 21615 | 0.450 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| deck:core-weyland | +0.191 |
| points | +0.190 |
| pointsToWin | -0.190 |
| threatGain | +0.175 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.117 |
| rdDensity | -0.114 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.087 |
| runnerCoverage | -0.085 |
| runnerRig | -0.085 |
| deck | +0.084 |
| remoteIce | +0.069 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| archivesAgendas | -0.067 |
| oddsRD | -0.066 |
| deck:core-hb | +0.065 |
| deck:core-shaper | +0.065 |
| runnerBreakers | -0.063 |
| threatLoss | -0.056 |
| runnerCredits | -0.053 |
| remotes | -0.052 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.041 |
| credits | +0.038 |
| rezDebt | +0.034 |
| unfunded | -0.031 |
| hand | +0.029 |
| rdIce | +0.026 |
| oddsHQ | -0.021 |
| deck:core-criminal | +0.021 |
| oddsRemote | +0.018 |
| turn | -0.011 |
| deck:core-jinteki | -0.004 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.003 |
| economyAssets | -0.002 |
| badPub | +0.000 |
