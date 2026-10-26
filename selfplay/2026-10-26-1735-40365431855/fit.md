# Learned evaluation fit

9759 positions from 600 games · train 7792, holdout 1967 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.530 | 0.632 | 72.7 % | 67.3 % |
| holdout | 0.606 | 0.659 | 65.6 % | 62.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 480 | 0.681 | 59.0 % |
| turns 5-8 | 475 | 0.649 | 62.1 % |
| turns 9-12 | 447 | 0.576 | 68.5 % |
| turns 13+ | 565 | 0.529 | 71.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.405 |
| points | +0.229 |
| pointsToWin | -0.229 |
| remotes | -0.206 |
| runnerPointsToWin | +0.204 |
| runnerPoints | -0.204 |
| hqIce | +0.193 |
| threatGain | +0.178 |
| economyAssets | -0.175 |
| rdDensity | -0.147 |
| runnerCoverage | -0.145 |
| threatLoss | -0.135 |
| oddsRD | -0.127 |
| remoteProgress | +0.120 |
| remoteIce | +0.114 |
| remoteAgendaPoints | +0.114 |
| runnerHand | -0.113 |
| oddsHQ | -0.112 |
| unfunded | +0.105 |
| runnerRig | +0.098 |
| rezDebt | +0.097 |
| credits | +0.096 |
| rdUnrezzed | -0.087 |
| hand | +0.075 |
| runnerBreakers | -0.066 |
| deck | +0.057 |
| rdIce | +0.056 |
| runnerCredits | +0.052 |
| creditLead | +0.050 |
| archivesAgendas | -0.049 |
| remoteUnrezzed | -0.044 |
| hqUnrezzed | -0.037 |
| agendasInHand | -0.031 |
| turn | -0.026 |
| oddsRemote | +0.021 |
| runnerTags | +0.011 |
| agendaPointsInHand | +0.008 |
| badPub | +0.000 |
