# Learned evaluation fit

417923 positions from 27357 games · train 333842, holdout 84081 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.548 | 0.647 | 71.9 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 65.0 % |
| turns 5-8 | 21298 | 0.584 | 69.5 % |
| turns 9-12 | 19374 | 0.516 | 74.6 % |
| turns 13+ | 21567 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| deck:core-weyland | +0.192 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.109 |
| hqIce | +0.108 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.089 |
| runnerRig | -0.087 |
| runnerCoverage | -0.085 |
| deck | +0.083 |
| oddsRD | -0.071 |
| remoteIce | +0.069 |
| agendaPointsInHand | -0.067 |
| creditLead | +0.067 |
| deck:core-shaper | +0.067 |
| deck:core-hb | +0.063 |
| archivesAgendas | -0.063 |
| threatLoss | -0.059 |
| runnerBreakers | -0.058 |
| runnerCredits | -0.053 |
| remotes | -0.051 |
| remoteUnrezzed | +0.045 |
| hqUnrezzed | +0.042 |
| runnerTags | +0.040 |
| credits | +0.038 |
| rezDebt | +0.033 |
| unfunded | -0.033 |
| rdIce | +0.029 |
| hand | +0.027 |
| deck:core-criminal | +0.025 |
| oddsRemote | +0.020 |
| oddsHQ | -0.017 |
| turn | -0.009 |
| deck:core-jinteki | -0.004 |
| economyAssets | -0.003 |
| runnerHand | +0.002 |
| rdUnrezzed | -0.002 |
| badPub | +0.000 |
