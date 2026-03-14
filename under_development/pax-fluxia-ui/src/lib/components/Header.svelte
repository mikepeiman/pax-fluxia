<script lang="ts">
  export let title: string = "PAX FLUXIA";
  export let user: { name: string, avatar: string } = { name: 'Mike', avatar: 'https://i.pravatar.cc/150?img=11' };
</script>

<header class="app-header">
  <div class="logo">
    <h1>{title}</h1>
    <span class="subtitle">Territory Control Strategy</span>
  </div>
  
  <div class="user-profile">
    <span class="username">{user.name}</span>
    <img src={user.avatar} alt={user.name} class="avatar" />
  </div>
</header>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.6);
    border-bottom: 2px solid var(--primary-color);
    box-shadow: 0 0 15px var(--primary-color);
    backdrop-filter: blur(5px);
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    flex-direction: column;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0;
    line-height: 1;
    color: var(--primary-color);
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  }

  .subtitle {
    font-size: 0.7rem;
    color: #aaa;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 5px 10px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .username {
    font-weight: bold;
    color: #fff;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--primary-color);
  }

  @media (max-width: 600px) {
    .app-header {
      padding: 10px;
    }
    
    h1 {
      font-size: 1.2rem;
    }
    
    .subtitle {
      display: none;
    }
  }
</style>
