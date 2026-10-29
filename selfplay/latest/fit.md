# Learned evaluation fit

139511 positions from 9000 games · train 111951, holdout 27560 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.525 | 0.628 | 73.4 % | 67.8 % |
| holdout | 0.515 | 0.629 | 74.2 % | 67.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 7166 | 0.612 | 67.3 % |
| turns 5-8 | 6918 | 0.552 | 71.9 % |
| turns 9-12 | 6317 | 0.480 | 77.0 % |
| turns 13+ | 7159 | 0.412 | 80.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.404 |
| deck:core-nbn | -0.269 |
| runnerPoints | -0.208 |
| runnerPointsToWin | +0.208 |
| deck:core-weyland | +0.202 |
| pointsToWin | -0.186 |
| points | +0.186 |
| threatGain | +0.160 |
| rdDensity | -0.132 |
| hqIce | +0.129 |
| remoteProgress | +0.127 |
| remoteAgendaPoints | +0.124 |
| deck:core-hb | +0.124 |
| runnerCoverage | -0.107 |
| deck:core-shaper | +0.094 |
| deck | +0.092 |
| agendasInHand | -0.087 |
| remotes | -0.084 |
| archivesAgendas | -0.073 |
| deck:core-anarch | -0.071 |
| creditLead | +0.067 |
| runnerBreakers | -0.063 |
| oddsRD | -0.062 |
| deck:core-jinteki | -0.061 |
| runnerCredits | -0.059 |
| agendaPointsInHand | -0.049 |
| runnerTags | +0.048 |
| remoteIce | +0.045 |
| threatLoss | -0.045 |
| remoteUnrezzed | +0.040 |
| hqUnrezzed | +0.040 |
| rezDebt | +0.038 |
| rdIce | +0.037 |
| hand | +0.037 |
| credits | +0.034 |
| oddsRemote | +0.028 |
| deck:core-criminal | -0.024 |
| rdUnrezzed | -0.023 |
| runnerRig | -0.023 |
| turn | +0.016 |
| unfunded | -0.013 |
| runnerHand | -0.012 |
| economyAssets | +0.006 |
| oddsHQ | -0.003 |
| badPub | +0.000 |
