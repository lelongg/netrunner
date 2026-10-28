# Learned evaluation fit

102847 positions from 6600 games · train 82577, holdout 20270 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.532 | 0.633 | 72.8 % | 67.2 % |
| holdout | 0.521 | 0.633 | 73.8 % | 67.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 5253 | 0.619 | 66.2 % |
| turns 5-8 | 5059 | 0.557 | 71.5 % |
| turns 9-12 | 4623 | 0.486 | 77.0 % |
| turns 13+ | 5335 | 0.420 | 80.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.383 |
| deck:core-nbn | -0.259 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.190 |
| pointsToWin | -0.170 |
| points | +0.170 |
| threatGain | +0.153 |
| deck:core-hb | +0.142 |
| rdDensity | -0.142 |
| hqIce | +0.129 |
| remoteProgress | +0.121 |
| remoteAgendaPoints | +0.118 |
| runnerCoverage | -0.115 |
| deck:core-shaper | +0.100 |
| deck | +0.087 |
| agendasInHand | -0.085 |
| archivesAgendas | -0.081 |
| remotes | -0.078 |
| deck:core-jinteki | -0.076 |
| oddsRD | -0.075 |
| deck:core-anarch | -0.069 |
| creditLead | +0.060 |
| runnerBreakers | -0.059 |
| remoteIce | +0.056 |
| remoteUnrezzed | +0.056 |
| threatLoss | -0.056 |
| agendaPointsInHand | -0.054 |
| hqUnrezzed | +0.053 |
| runnerCredits | -0.052 |
| runnerTags | +0.048 |
| hand | +0.046 |
| rdUnrezzed | -0.045 |
| turn | +0.035 |
| rdIce | +0.034 |
| deck:core-criminal | -0.032 |
| credits | +0.031 |
| rezDebt | +0.029 |
| oddsRemote | +0.027 |
| runnerHand | -0.012 |
| unfunded | -0.012 |
| economyAssets | -0.005 |
| oddsHQ | -0.004 |
| runnerRig | -0.002 |
| badPub | +0.000 |
