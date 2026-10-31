# Learned evaluation fit

267734 positions from 17400 games · train 214276, holdout 53458 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.537 | 0.641 | 72.6 % | 66.0 % |
| holdout | 0.530 | 0.642 | 73.0 % | 65.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 13875 | 0.624 | 66.2 % |
| turns 5-8 | 13441 | 0.566 | 70.7 % |
| turns 9-12 | 12316 | 0.497 | 75.8 % |
| turns 13+ | 13826 | 0.430 | 79.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.409 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.198 |
| pointsToWin | -0.187 |
| points | +0.187 |
| threatGain | +0.169 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.128 |
| hqIce | +0.123 |
| rdDensity | -0.123 |
| deck | +0.098 |
| deck:core-anarch | -0.095 |
| deck:core-shaper | +0.094 |
| runnerCoverage | -0.094 |
| agendasInHand | -0.087 |
| deck:core-hb | +0.085 |
| archivesAgendas | -0.078 |
| creditLead | +0.067 |
| agendaPointsInHand | -0.067 |
| remotes | -0.065 |
| oddsRD | -0.060 |
| remoteIce | +0.059 |
| runnerBreakers | -0.058 |
| runnerCredits | -0.056 |
| runnerRig | -0.047 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.042 |
| threatLoss | -0.040 |
| hqUnrezzed | +0.038 |
| credits | +0.035 |
| hand | +0.033 |
| deck:core-jinteki | -0.031 |
| rezDebt | +0.029 |
| rdIce | +0.025 |
| unfunded | -0.020 |
| oddsRemote | +0.018 |
| oddsHQ | -0.006 |
| rdUnrezzed | -0.005 |
| economyAssets | -0.004 |
| runnerHand | -0.002 |
| turn | -0.000 |
| deck:core-criminal | +0.000 |
| badPub | +0.000 |
