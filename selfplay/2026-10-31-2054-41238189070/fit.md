# Learned evaluation fit

285902 positions from 18600 games · train 228883, holdout 57019 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.538 | 0.642 | 72.6 % | 65.9 % |
| holdout | 0.532 | 0.644 | 72.9 % | 65.5 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 14831 | 0.628 | 65.8 % |
| turns 5-8 | 14368 | 0.570 | 70.5 % |
| turns 9-12 | 13137 | 0.498 | 75.6 % |
| turns 13+ | 14683 | 0.428 | 79.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.411 |
| deck:core-nbn | -0.256 |
| runnerPointsToWin | +0.204 |
| runnerPoints | -0.204 |
| deck:core-weyland | +0.196 |
| points | +0.185 |
| pointsToWin | -0.185 |
| threatGain | +0.168 |
| remoteProgress | +0.130 |
| remoteAgendaPoints | +0.127 |
| hqIce | +0.121 |
| rdDensity | -0.119 |
| deck | +0.094 |
| deck:core-anarch | -0.094 |
| runnerCoverage | -0.093 |
| deck:core-shaper | +0.092 |
| agendasInHand | -0.087 |
| archivesAgendas | -0.084 |
| deck:core-hb | +0.084 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.067 |
| oddsRD | -0.064 |
| remotes | -0.063 |
| runnerBreakers | -0.059 |
| remoteIce | +0.053 |
| runnerCredits | -0.052 |
| runnerRig | -0.050 |
| threatLoss | -0.043 |
| runnerTags | +0.042 |
| remoteUnrezzed | +0.039 |
| hqUnrezzed | +0.039 |
| credits | +0.038 |
| hand | +0.036 |
| rdIce | +0.033 |
| rezDebt | +0.031 |
| deck:core-jinteki | -0.028 |
| oddsRemote | +0.019 |
| unfunded | -0.018 |
| rdUnrezzed | -0.011 |
| economyAssets | -0.006 |
| oddsHQ | -0.005 |
| deck:core-criminal | +0.001 |
| turn | -0.001 |
| runnerHand | -0.001 |
| badPub | +0.000 |
