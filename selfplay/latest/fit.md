# Learned evaluation fit

418302 positions from 27357 games · train 334030, holdout 84272 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.649 | 71.8 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.8 % |
| turns 5-8 | 21301 | 0.584 | 69.4 % |
| turns 9-12 | 19397 | 0.516 | 74.6 % |
| turns 13+ | 21732 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.424 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.194 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.116 |
| rdDensity | -0.112 |
| agendasInHand | -0.091 |
| deck:core-anarch | -0.086 |
| runnerCoverage | -0.086 |
| deck | +0.084 |
| runnerRig | -0.083 |
| remoteIce | +0.070 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| oddsRD | -0.066 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.063 |
| deck:core-shaper | +0.059 |
| threatLoss | -0.059 |
| archivesAgendas | -0.058 |
| runnerCredits | -0.052 |
| remotes | -0.052 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.039 |
| credits | +0.039 |
| unfunded | -0.038 |
| rezDebt | +0.034 |
| hand | +0.029 |
| deck:core-criminal | +0.026 |
| rdIce | +0.022 |
| oddsHQ | -0.021 |
| oddsRemote | +0.019 |
| turn | -0.012 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.003 |
| rdUnrezzed | +0.002 |
| economyAssets | -0.000 |
| badPub | +0.000 |
