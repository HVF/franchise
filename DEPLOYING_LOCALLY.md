If you want to try franchise out, there's an online version you try right now [right here](https://franchise.cloud).

If you're interested in contributing, there are instructions for running franchise in development mode in [the readme](https://github.com/HVF/franchise#running-locally).

Otherwise...

# Deploying Locally
0. **If you don't have `npm` or `yarn`, install** [yarn](https://yarnpkg.com/en/docs/install).

1. **Open up a terminal and run**

    ```bash
    git clone --depth 1 https://github.com/HVF/franchise.git
    ```

2. **cd into the project directory**
    ```bash
    cd franchise
    ```

3. **Install the project dependencies**
    ```bash
    yarn install
    ```

    (you can also run `npm install`)

4. **Build franchise to static files**
    ```bash
    yarn build
    ```
    This command makes a folder named `/bundle` containing an `index.html` file which runs franchise when you open it in a browser.

5. **Serve the static files**

    Use the http server of your choice to serve the contents of the `/bundle` directory. Using python, you might write:
    
    ```bash
    cd bundle
    python -m SimpleHTTPServer
    ```

6. (optional) **Email us at sql@hvflabs.com if you're doing something interesting with franchise!**
