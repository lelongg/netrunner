# Learned evaluation fit

418068 positions from 27357 games · train 333939, holdout 84129 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.5 % |
| holdout | 0.547 | 0.647 | 71.9 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.637 | 65.0 % |
| turns 5-8 | 21302 | 0.583 | 69.5 % |
| turns 9-12 | 19390 | 0.516 | 74.6 % |
| turns 13+ | 21596 | 0.450 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.194 |
| pointsToWin | -0.190 |
| points | +0.190 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.107 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.090 |
| runnerRig | -0.086 |
| runnerCoverage | -0.084 |
| deck | +0.084 |
| remoteIce | +0.073 |
| oddsRD | -0.070 |
| agendaPointsInHand | -0.070 |
| creditLead | +0.067 |
| deck:core-shaper | +0.063 |
| deck:core-hb | +0.062 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.060 |
| threatLoss | -0.055 |
| runnerCredits | -0.053 |
| remotes | -0.050 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.039 |
| credits | +0.038 |
| rezDebt | +0.033 |
| unfunded | -0.033 |
| hand | +0.029 |
| rdIce | +0.028 |
| deck:core-criminal | +0.027 |
| oddsHQ | -0.021 |
| oddsRemote | +0.018 |
| turn | -0.011 |
| economyAssets | -0.008 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
