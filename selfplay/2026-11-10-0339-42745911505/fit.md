# Learned evaluation fit

418356 positions from 27357 games · train 334074, holdout 84282 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.7 % |
| turns 5-8 | 21313 | 0.586 | 69.3 % |
| turns 9-12 | 19410 | 0.518 | 74.6 % |
| turns 13+ | 21716 | 0.449 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| points | +0.194 |
| pointsToWin | -0.194 |
| deck:core-weyland | +0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.110 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| runnerCoverage | -0.087 |
| runnerRig | -0.085 |
| deck | +0.083 |
| agendaPointsInHand | -0.072 |
| remoteIce | +0.071 |
| creditLead | +0.069 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.064 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.063 |
| archivesAgendas | -0.061 |
| threatLoss | -0.057 |
| remotes | -0.056 |
| runnerCredits | -0.053 |
| remoteUnrezzed | +0.045 |
| hqUnrezzed | +0.043 |
| rezDebt | +0.040 |
| runnerTags | +0.039 |
| credits | +0.039 |
| unfunded | -0.034 |
| hand | +0.029 |
| rdIce | +0.025 |
| deck:core-criminal | +0.025 |
| oddsHQ | -0.018 |
| oddsRemote | +0.018 |
| turn | -0.009 |
| deck:core-jinteki | -0.006 |
| economyAssets | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
