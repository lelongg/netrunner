# Learned evaluation fit

418350 positions from 27357 games · train 334078, holdout 84272 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.8 % |
| holdout | 0.550 | 0.648 | 71.7 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.640 | 64.7 % |
| turns 5-8 | 21311 | 0.587 | 69.2 % |
| turns 9-12 | 19412 | 0.519 | 74.4 % |
| turns 13+ | 21708 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| pointsToWin | -0.194 |
| points | +0.194 |
| deck:core-weyland | +0.193 |
| threatGain | +0.177 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.117 |
| rdDensity | -0.113 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.089 |
| deck | +0.087 |
| runnerRig | -0.084 |
| runnerCoverage | -0.084 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| remoteIce | +0.068 |
| oddsRD | -0.068 |
| deck:core-shaper | +0.063 |
| deck:core-hb | +0.062 |
| archivesAgendas | -0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.056 |
| runnerCredits | -0.054 |
| remotes | -0.052 |
| hqUnrezzed | +0.039 |
| runnerTags | +0.039 |
| remoteUnrezzed | +0.039 |
| credits | +0.038 |
| rezDebt | +0.038 |
| unfunded | -0.031 |
| hand | +0.027 |
| deck:core-criminal | +0.024 |
| rdIce | +0.023 |
| oddsHQ | -0.021 |
| oddsRemote | +0.017 |
| turn | -0.014 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.005 |
| economyAssets | -0.004 |
| rdUnrezzed | +0.002 |
| badPub | +0.000 |
