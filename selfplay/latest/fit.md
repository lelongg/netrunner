# Learned evaluation fit

418251 positions from 27357 games · train 334000, holdout 84251 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.1 % | 64.8 % |
| holdout | 0.550 | 0.649 | 71.6 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.7 % |
| turns 5-8 | 21314 | 0.586 | 69.2 % |
| turns 9-12 | 19411 | 0.520 | 74.3 % |
| turns 13+ | 21683 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.426 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.197 |
| runnerPointsToWin | +0.197 |
| points | +0.192 |
| pointsToWin | -0.192 |
| deck:core-weyland | +0.189 |
| threatGain | +0.173 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.115 |
| rdDensity | -0.111 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| runnerCoverage | -0.087 |
| runnerRig | -0.086 |
| deck | +0.085 |
| agendaPointsInHand | -0.071 |
| oddsRD | -0.069 |
| creditLead | +0.067 |
| remoteIce | +0.065 |
| deck:core-shaper | +0.065 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.059 |
| archivesAgendas | -0.059 |
| threatLoss | -0.057 |
| runnerCredits | -0.050 |
| remotes | -0.048 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.040 |
| runnerTags | +0.040 |
| credits | +0.039 |
| rezDebt | +0.038 |
| unfunded | -0.032 |
| hand | +0.032 |
| rdIce | +0.022 |
| deck:core-criminal | +0.022 |
| oddsRemote | +0.020 |
| oddsHQ | -0.019 |
| turn | -0.013 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.004 |
| economyAssets | -0.000 |
| badPub | +0.000 |
