<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>circle-orb-effect-1</title>
    <style>
        @property --blur {
            syntax: "<length>";
            initial-value: 0;
            inherits: true;
        }

        @property --spread {
            syntax: "<length>";
            initial-value: 0;
            inherits: true;
        }

        @property --color {
            syntax: "<color>";
            initial-value: red;
            inherits: true;
        }

        @property --lighter-color {
            syntax: "<color>";
            initial-value: color-mix(in srgb, var(--color) 80%, white);
            inherits: true;
        }

        @property --darker-color {
            syntax: "<color>";
            initial-value: color-mix(in srgb, var(--color) 60%, black);
            inherits: true;
        }

        @property --angle {
            syntax: "<angle>";
            initial-value: 0deg;
            inherits: true;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            display: grid;
            place-content: center;
            background-color: #000;
        }

        .orb {
            --size: 200px;
            --color: red;
            --lighter-color: color-mix(in srgb, var(--color) 60%, white);
            --darker-color: color-mix(in srgb, var(--color) 40%, black);
            --blur: 40px;
            --spread: 5px;
            --angle: -90deg;
            --border: 10px;

            position: relative;
            width: var(--size);
            height: var(--size);
            aspect-ratio: 1;
            background:
                radial-gradient(color-mix(in srgb, var(--darker-color) 65%, transparent) -50%, transparent 50%),
                radial-gradient(var(--color), var(--color)) no-repeat 50% 50% / 50% 50%,
                radial-gradient(var(--color), var(--color)) no-repeat 50% 50% / 50% 50%,
                url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Apple_logo_grey.svg/1724px-Apple_logo_grey.svg.png') no-repeat 50% 45% / 35%,
                linear-gradient(#000, #000) padding-box,
                conic-gradient(from var(--angle) at 50% 50%, color-mix(in srgb, var(--lighter-color), transparent) 0 72deg, var(--darker-color) 100deg 180deg, transparent 288deg, color-mix(in srgb, var(--lighter-color), transparent)) border-box,
                radial-gradient(farthest-corner at 50% 50%, transparent 50%, var(--darker-color) 80% 100%) border-box;

            background-blend-mode: normal, overlay, multiply, normal, normal, normal, normal;
            border: var(--border) solid transparent;
            border-radius: 50%;
            box-shadow: 0 0 var(--blur) var(--spread) var(--darker-color);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: 10s linear infinite change-color, 5s linear infinite orb;

        }

        @keyframes change-color {
            0% {
                --color: red;
            }

            12% {
                --color: orange;
            }

            24% {
                --color: yellow;
            }

            36% {
                --color: chartreuse;
            }

            48% {
                --color: springgreen;
            }

            60% {
                --color: dodgerblue;
            }

            72% {
                --color: purple;
            }

            84% {
                --color: red;
            }
        }

        @keyframes orb {
            0% {
                --angle: -90deg;
                --blur: 40px;
                --spread: 5px;
            }

            50% {
                --blur: 80px;
                --spread: 10px;
            }

            100% {
                --angle: 270deg;
            }
        }

        .orb:hover {
            animation: reset .2s linear 1 forwards;
        }

        @keyframes reset {
            to {
                --color: gray;
                --blur: 40px;
                --spread: 5px;
                --angle: -90deg;
            }
        }
    </style>
</head>

<body>
    <div class="orb"></div>
</body>

</html>