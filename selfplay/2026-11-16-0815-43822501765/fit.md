# Learned evaluation fit

418402 positions from 27357 games · train 334168, holdout 84234 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.543 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 65.0 % |
| turns 5-8 | 21304 | 0.586 | 69.3 % |
| turns 9-12 | 19385 | 0.519 | 74.4 % |
| turns 13+ | 21703 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.426 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.194 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| rdDensity | -0.113 |
| hqIce | +0.110 |
| deck:core-anarch | -0.089 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.086 |
| deck | +0.085 |
| runnerRig | -0.083 |
| remoteIce | +0.073 |
| agendaPointsInHand | -0.070 |
| creditLead | +0.067 |
| oddsRD | -0.067 |
| runnerBreakers | -0.064 |
| deck:core-hb | +0.063 |
| archivesAgendas | -0.062 |
| deck:core-shaper | +0.061 |
| threatLoss | -0.060 |
| runnerCredits | -0.055 |
| remotes | -0.052 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.041 |
| runnerTags | +0.039 |
| credits | +0.036 |
| unfunded | -0.036 |
| rezDebt | +0.035 |
| rdIce | +0.030 |
| hand | +0.029 |
| deck:core-criminal | +0.027 |
| oddsRemote | +0.020 |
| oddsHQ | -0.017 |
| turn | -0.010 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.007 |
| rdUnrezzed | -0.002 |
| runnerHand | +0.002 |
| badPub | +0.000 |
