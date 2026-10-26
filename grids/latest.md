## base

### design split · Corp 73 of 144 · decision 35 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 7 | 7 | 8 | 22 |
| Advanced Yomi | 9 | 3 | 6 | 18 |
| Hyper Velocity | 1 | 5 | 3 | 9 |
| Quick and Dirty | 7 | 8 | 9 | 24 |

Corp mistakes: Hyper Velocity stolen-from-remote 32, Discretion Advised stolen-from-remote 29, Discretion Advised rich-credit-click 25, Advanced Yomi stolen-from-remote 24, Quick and Dirty stolen-from-remote 17, Quick and Dirty rich-credit-click 16, Hyper Velocity unrezzable-install 9, Hyper Velocity thin-install 8

### test split · Corp 80 of 144 · decision 36 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 9 | 8 | 8 | 25 |
| Advanced Yomi | 4 | 4 | 6 | 14 |
| Hyper Velocity | 5 | 3 | 6 | 14 |
| Quick and Dirty | 9 | 9 | 9 | 27 |

Corp mistakes: Discretion Advised rich-credit-click 54, Hyper Velocity stolen-from-remote 37, Advanced Yomi rich-credit-click 33, Discretion Advised stolen-from-remote 19, Advanced Yomi stolen-from-remote 19, Quick and Dirty stolen-from-remote 16, Quick and Dirty rich-credit-click 13, Discretion Advised thin-install 9

## learned (`--search 1 --weights weights.json`)

### design split · Corp 72 of 144 · decision 131 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 7 | 6 | 4 | 17 |
| Advanced Yomi | 7 | 5 | 6 | 18 |
| Hyper Velocity | 6 | 5 | 2 | 13 |
| Quick and Dirty | 8 | 7 | 9 | 24 |

Corp mistakes: Discretion Advised rich-credit-click 33, Hyper Velocity stolen-from-remote 32, Discretion Advised stolen-from-remote 28, Quick and Dirty stolen-from-remote 26, Advanced Yomi stolen-from-remote 22, Quick and Dirty rich-credit-click 22, Hyper Velocity rich-credit-click 11, Advanced Yomi rich-credit-click 9

### test split · Corp 84 of 144 · decision 138 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 6 | 8 | 9 | 23 |
| Advanced Yomi | 6 | 4 | 10 | 20 |
| Hyper Velocity | 4 | 5 | 5 | 14 |
| Quick and Dirty | 11 | 7 | 9 | 27 |

Corp mistakes: Discretion Advised rich-credit-click 48, Hyper Velocity stolen-from-remote 40, Advanced Yomi stolen-from-remote 23, Quick and Dirty stolen-from-remote 22, Discretion Advised stolen-from-remote 17, Quick and Dirty rich-credit-click 15, Discretion Advised thin-install 9, Advanced Yomi rich-credit-click 9

## search (`--search 1`)

### design split · Corp 71 of 144 · decision 133 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 7 | 7 | 9 | 23 |
| Advanced Yomi | 5 | 5 | 4 | 14 |
| Hyper Velocity | 1 | 5 | 4 | 10 |
| Quick and Dirty | 9 | 7 | 8 | 24 |

Corp mistakes: Advanced Yomi rich-credit-click 52, Discretion Advised rich-credit-click 46, Quick and Dirty rich-credit-click 39, Hyper Velocity rich-credit-click 32, Hyper Velocity stolen-from-remote 32, Discretion Advised stolen-from-remote 19, Quick and Dirty stolen-from-remote 17, Advanced Yomi stolen-from-remote 15

### test split · Corp 79 of 144 · decision 137 ms

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead | total |
|---|---|---|---|---|
| Discretion Advised | 9 | 7 | 10 | 26 |
| Advanced Yomi | 5 | 1 | 6 | 12 |
| Hyper Velocity | 5 | 3 | 4 | 12 |
| Quick and Dirty | 12 | 7 | 10 | 29 |

Corp mistakes: Discretion Advised rich-credit-click 50, Advanced Yomi rich-credit-click 47, Quick and Dirty rich-credit-click 47, Hyper Velocity stolen-from-remote 36, Hyper Velocity rich-credit-click 20, Quick and Dirty stolen-from-remote 19, Advanced Yomi stolen-from-remote 15, Quick and Dirty thin-install 14

## Side by side

| split | base | learned | search |
|---|---|---|---|
| design | 73 / 144 | 72 / 144 | 71 / 144 |
| test | 80 / 144 | 84 / 144 | 79 / 144 |
