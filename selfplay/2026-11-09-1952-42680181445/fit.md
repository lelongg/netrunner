# Learned evaluation fit

418488 positions from 27357 games · train 334369, holdout 84119 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.550 | 0.650 | 71.7 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.641 | 64.6 % |
| turns 5-8 | 21316 | 0.587 | 69.1 % |
| turns 9-12 | 19377 | 0.518 | 74.6 % |
| turns 13+ | 21584 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.196 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.177 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.113 |
| rdDensity | -0.110 |
| deck:core-anarch | -0.092 |
| runnerRig | -0.088 |
| agendasInHand | -0.088 |
| deck | +0.084 |
| runnerCoverage | -0.083 |
| remoteIce | +0.071 |
| oddsRD | -0.068 |
| agendaPointsInHand | -0.067 |
| creditLead | +0.066 |
| deck:core-hb | +0.062 |
| archivesAgendas | -0.061 |
| deck:core-shaper | +0.060 |
| runnerBreakers | -0.059 |
| threatLoss | -0.057 |
| remotes | -0.054 |
| runnerCredits | -0.054 |
| hqUnrezzed | +0.045 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.039 |
| unfunded | -0.036 |
| credits | +0.036 |
| rezDebt | +0.034 |
| deck:core-criminal | +0.031 |
| hand | +0.029 |
| rdIce | +0.027 |
| oddsHQ | -0.020 |
| oddsRemote | +0.017 |
| economyAssets | -0.009 |
| turn | -0.008 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
