# Learned evaluation fit

418312 positions from 27357 games · train 334145, holdout 84167 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.550 | 0.650 | 71.7 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.8 % |
| turns 5-8 | 21307 | 0.586 | 69.2 % |
| turns 9-12 | 19398 | 0.518 | 74.5 % |
| turns 13+ | 21619 | 0.453 | 78.5 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| pointsToWin | -0.192 |
| points | +0.192 |
| deck:core-weyland | +0.190 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.115 |
| rdDensity | -0.111 |
| runnerRig | -0.094 |
| deck:core-anarch | -0.092 |
| agendasInHand | -0.089 |
| deck | +0.085 |
| runnerCoverage | -0.083 |
| remoteIce | +0.070 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.069 |
| oddsRD | -0.068 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.065 |
| archivesAgendas | -0.063 |
| runnerBreakers | -0.058 |
| threatLoss | -0.055 |
| runnerCredits | -0.053 |
| remotes | -0.051 |
| hqUnrezzed | +0.044 |
| credits | +0.039 |
| runnerTags | +0.039 |
| remoteUnrezzed | +0.037 |
| rezDebt | +0.037 |
| unfunded | -0.031 |
| hand | +0.030 |
| rdIce | +0.029 |
| deck:core-criminal | +0.025 |
| oddsHQ | -0.018 |
| oddsRemote | +0.017 |
| turn | -0.011 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.004 |
| economyAssets | -0.004 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
