# Learned evaluation fit

418498 positions from 27357 games · train 334438, holdout 84060 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.7 % |
| holdout | 0.548 | 0.648 | 71.8 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.9 % |
| turns 5-8 | 21310 | 0.585 | 69.3 % |
| turns 9-12 | 19407 | 0.515 | 74.6 % |
| turns 13+ | 21501 | 0.447 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.199 |
| runnerPointsToWin | +0.199 |
| points | +0.194 |
| pointsToWin | -0.194 |
| deck:core-weyland | +0.192 |
| threatGain | +0.173 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.115 |
| hqIce | +0.109 |
| agendasInHand | -0.088 |
| deck:core-anarch | -0.087 |
| deck | +0.087 |
| runnerRig | -0.087 |
| runnerCoverage | -0.086 |
| remoteIce | +0.072 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.068 |
| oddsRD | -0.068 |
| deck:core-hb | +0.064 |
| archivesAgendas | -0.063 |
| deck:core-shaper | +0.062 |
| runnerBreakers | -0.060 |
| threatLoss | -0.059 |
| runnerCredits | -0.052 |
| remotes | -0.050 |
| hqUnrezzed | +0.049 |
| remoteUnrezzed | +0.039 |
| credits | +0.039 |
| runnerTags | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.032 |
| hand | +0.026 |
| rdIce | +0.026 |
| deck:core-criminal | +0.025 |
| oddsHQ | -0.021 |
| oddsRemote | +0.020 |
| turn | -0.013 |
| deck:core-jinteki | -0.008 |
| runnerHand | +0.006 |
| economyAssets | -0.004 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
