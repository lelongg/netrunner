# Learned evaluation fit

418537 positions from 27357 games · train 334234, holdout 84303 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.550 | 0.649 | 71.6 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.640 | 64.6 % |
| turns 5-8 | 21308 | 0.588 | 69.0 % |
| turns 9-12 | 19405 | 0.519 | 74.5 % |
| turns 13+ | 21749 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.252 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| deck:core-weyland | +0.191 |
| pointsToWin | -0.191 |
| points | +0.191 |
| threatGain | +0.173 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.116 |
| hqIce | +0.116 |
| agendasInHand | -0.092 |
| runnerCoverage | -0.089 |
| deck:core-anarch | -0.089 |
| deck | +0.084 |
| runnerRig | -0.081 |
| agendaPointsInHand | -0.073 |
| remoteIce | +0.073 |
| oddsRD | -0.069 |
| creditLead | +0.066 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.064 |
| deck:core-shaper | +0.059 |
| threatLoss | -0.057 |
| archivesAgendas | -0.055 |
| remotes | -0.054 |
| runnerCredits | -0.052 |
| remoteUnrezzed | +0.042 |
| hqUnrezzed | +0.042 |
| runnerTags | +0.042 |
| rezDebt | +0.037 |
| credits | +0.037 |
| unfunded | -0.033 |
| deck:core-criminal | +0.029 |
| hand | +0.028 |
| rdIce | +0.026 |
| oddsHQ | -0.021 |
| oddsRemote | +0.019 |
| turn | -0.008 |
| economyAssets | -0.007 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.006 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
