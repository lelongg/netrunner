# Learned evaluation fit

417738 positions from 27357 games · train 333612, holdout 84126 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.550 | 0.650 | 71.7 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21839 | 0.640 | 64.6 % |
| turns 5-8 | 21295 | 0.587 | 69.1 % |
| turns 9-12 | 19378 | 0.520 | 74.4 % |
| turns 13+ | 21614 | 0.450 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.259 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| deck:core-weyland | +0.194 |
| points | +0.191 |
| pointsToWin | -0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.115 |
| rdDensity | -0.110 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| deck | +0.086 |
| runnerRig | -0.086 |
| runnerCoverage | -0.086 |
| remoteIce | +0.076 |
| agendaPointsInHand | -0.070 |
| oddsRD | -0.068 |
| creditLead | +0.068 |
| deck:core-hb | +0.066 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.062 |
| runnerBreakers | -0.059 |
| threatLoss | -0.059 |
| runnerCredits | -0.054 |
| remotes | -0.050 |
| hqUnrezzed | +0.040 |
| runnerTags | +0.039 |
| remoteUnrezzed | +0.039 |
| credits | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.033 |
| hand | +0.031 |
| rdIce | +0.024 |
| deck:core-criminal | +0.024 |
| oddsHQ | -0.019 |
| oddsRemote | +0.018 |
| turn | -0.008 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.002 |
| economyAssets | +0.001 |
| badPub | +0.000 |
