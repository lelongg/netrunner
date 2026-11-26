# Learned evaluation fit

418271 positions from 27357 games · train 334166, holdout 84105 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.648 | 72.2 % | 64.9 % |
| holdout | 0.550 | 0.649 | 71.6 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.641 | 64.5 % |
| turns 5-8 | 21310 | 0.587 | 69.1 % |
| turns 9-12 | 19397 | 0.519 | 74.4 % |
| turns 13+ | 21555 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.256 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| deck:core-weyland | +0.196 |
| pointsToWin | -0.192 |
| points | +0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.111 |
| rdDensity | -0.110 |
| deck:core-anarch | -0.090 |
| agendasInHand | -0.088 |
| runnerCoverage | -0.086 |
| deck | +0.084 |
| runnerRig | -0.084 |
| agendaPointsInHand | -0.072 |
| creditLead | +0.068 |
| remoteIce | +0.067 |
| oddsRD | -0.067 |
| archivesAgendas | -0.063 |
| deck:core-hb | +0.063 |
| deck:core-shaper | +0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.056 |
| runnerCredits | -0.053 |
| remotes | -0.052 |
| hqUnrezzed | +0.046 |
| remoteUnrezzed | +0.040 |
| credits | +0.039 |
| runnerTags | +0.038 |
| rezDebt | +0.038 |
| unfunded | -0.031 |
| hand | +0.030 |
| deck:core-criminal | +0.028 |
| rdIce | +0.022 |
| oddsRemote | +0.019 |
| oddsHQ | -0.017 |
| turn | -0.008 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.003 |
| economyAssets | +0.002 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
