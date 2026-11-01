# Learned evaluation fit

340092 positions from 22200 games · train 272359, holdout 67733 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.539 | 0.645 | 72.4 % | 65.4 % |
| holdout | 0.536 | 0.647 | 72.5 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 17702 | 0.631 | 65.3 % |
| turns 5-8 | 17150 | 0.573 | 70.3 % |
| turns 9-12 | 15625 | 0.502 | 75.4 % |
| turns 13+ | 17256 | 0.433 | 79.5 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.422 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.205 |
| runnerPointsToWin | +0.205 |
| deck:core-weyland | +0.194 |
| points | +0.190 |
| pointsToWin | -0.190 |
| threatGain | +0.170 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.127 |
| rdDensity | -0.123 |
| hqIce | +0.118 |
| deck:core-anarch | -0.096 |
| deck | +0.096 |
| agendasInHand | -0.090 |
| runnerCoverage | -0.086 |
| deck:core-shaper | +0.086 |
| archivesAgendas | -0.076 |
| deck:core-hb | +0.075 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.066 |
| runnerRig | -0.064 |
| oddsRD | -0.060 |
| remotes | -0.058 |
| runnerBreakers | -0.056 |
| remoteIce | +0.056 |
| runnerCredits | -0.055 |
| threatLoss | -0.045 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.040 |
| rdIce | +0.036 |
| remoteUnrezzed | +0.036 |
| rezDebt | +0.036 |
| hand | +0.034 |
| credits | +0.034 |
| deck:core-jinteki | -0.021 |
| unfunded | -0.019 |
| oddsRemote | +0.019 |
| oddsHQ | -0.010 |
| deck:core-criminal | +0.010 |
| economyAssets | -0.008 |
| rdUnrezzed | -0.004 |
| turn | -0.003 |
| runnerHand | +0.003 |
| badPub | +0.000 |
